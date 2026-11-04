import express, { type ErrorRequestHandler, type Request } from "express";
import { z, ZodError } from "zod";
import {
  productCategories,
  productIdSchema,
  productQuerySchema,
  type ApiError,
  type HealthResponse,
  type Product,
  type ProductDetailResponse,
  type ProductListResponse,
  type ReadyResponse,
} from "../shared/contracts.js";
import { isCatalogueReady, products } from "./catalogue.js";

class RequestValidationError extends Error {}

const parseQuery = (request: Request, allowed: readonly string[]) => {
  const queryStart = request.originalUrl.indexOf("?");
  const rawQuery = queryStart === -1 ? "" : request.originalUrl.slice(queryStart + 1);
  // URLSearchParams otherwise tolerates malformed percent escapes and UTF-8.
  decodeURIComponent(rawQuery);
  const parameters = new URLSearchParams(rawQuery);
  const seen = new Set<string>();
  for (const name of parameters.keys()) {
    if (!allowed.includes(name)) {
      throw new RequestValidationError("Unknown query parameter.");
    }
    if (seen.has(name)) {
      throw new RequestValidationError("Query parameters must not be repeated.");
    }
    seen.add(name);
  }
  return Object.fromEntries(parameters);
};

const productPathSchema = z.strictObject({ id: productIdSchema });

export const createApp = (items: readonly Product[] = products) => {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", false);

  app.get("/health", (request, response) => {
    parseQuery(request, []);
    response.json({ status: "ok" } satisfies HealthResponse);
  });

  app.get("/ready", (request, response) => {
    parseQuery(request, []);
    if (!isCatalogueReady(items)) {
      console.error("catalogue_not_ready: empty, invalid, or duplicate product data");
      response.status(503).json({
        error: {
          code: "NOT_READY",
          message: "The product catalogue is unavailable.",
        },
      } satisfies ApiError);
      return;
    }
    response.json({ status: "ready" } satisfies ReadyResponse);
  });

  app.get("/api/products", (request, response) => {
    const query = productQuerySchema.parse(parseQuery(request, ["q", "category"]));
    if (query.q !== "" || query.category !== undefined) {
      response.status(400).json({
        error: {
          code: "UNSUPPORTED_QUERY",
          message: "Search and category filtering are participant work, not implemented in this starter.",
        },
      } satisfies ApiError);
      return;
    }
    response.json({
      items: [...items],
      total: items.length,
      query: { q: "" },
      categories: [...productCategories],
    } satisfies ProductListResponse);
  });

  app.get("/api/products/:id", (request, response) => {
    parseQuery(request, []);
    const { id } = productPathSchema.parse(request.params);
    const product = items.find((candidate) => candidate.id === id);
    if (!product) {
      response.status(404).json({
        error: { code: "NOT_FOUND", message: "Product was not found." },
      } satisfies ApiError);
      return;
    }
    response.json({ product } satisfies ProductDetailResponse);
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: "NOT_FOUND", message: "Route was not found." },
    } satisfies ApiError);
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof RequestValidationError || error instanceof URIError) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof URIError
            ? "Request URL must use valid percent encoding."
            : error.message,
        },
      } satisfies ApiError);
      return;
    }
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = String(issue.path[0] ?? "request");
        (fieldErrors[field] ??= []).push(issue.message);
      }
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid parameters.",
          fieldErrors,
        },
      } satisfies ApiError);
      return;
    }
    console.error("catalogue_request_failed", error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    } satisfies ApiError);
  };
  app.use(errorHandler);

  return app;
};
