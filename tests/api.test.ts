import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/server/app.js";
import { productCategories, productSchema } from "../src/shared/contracts.js";
import listExample from "../contracts/examples/products-list.json" with { type: "json" };
import detailExample from "../contracts/examples/product-detail.json" with { type: "json" };
import healthExample from "../contracts/examples/health.json" with { type: "json" };
import readyExample from "../contracts/examples/ready.json" with { type: "json" };
import unsupportedExample from "../contracts/examples/unsupported-query.json" with { type: "json" };
import validationExample from "../contracts/examples/validation-error.json" with { type: "json" };
import notFoundExample from "../contracts/examples/not-found.json" with { type: "json" };
import notReadyExample from "../contracts/examples/not-ready.json" with { type: "json" };

const app = createApp();
const product = productSchema.parse(detailExample.product);

afterEach(() => vi.restoreAllMocks());

describe("browse/detail baseline", () => {
  it.each(["", "?q=", "?q"])("returns the complete deterministic list for %j", async (query) => {
    const response = await request(app)
      .get(`/api/products${query}`)
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual(listExample);
  });

  it.each(listExample.items)("returns every field for $id", async (item) => {
    const response = await request(app)
      .get(`/api/products/${item.id}`)
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({ product: item });
  });

  it("does not mutate the catalogue across requests", async () => {
    await request(app).get("/api/products?q=lamp").expect(400);
    await request(app).get("/api/products/aurora-desk-lamp").expect(200);
    const response = await request(app).get("/api/products").expect(200);
    expect(response.body).toEqual(listExample);
  });

  it("returns a JSON 404 for a missing product", async () => {
    const response = await request(app).get("/api/products/not-a-product").expect(404);
    expect(response.body).toEqual(notFoundExample);
  });

  it("does not expose a UI or a write API", async () => {
    const unknownRoute = await request(app).get("/").expect(404);
    const write = await request(app).post("/api/products").send(product).expect(404);
    expect(unknownRoute.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route was not found." },
    });
    expect(write.body).toEqual(unknownRoute.body);
    const response = await request(app).get("/api/products").expect(200);
    expect(response.body).toEqual(listExample);
  });
});

describe("participant-owned queries", () => {
  it.each([
    "q=lamp",
    "q=%20",
    "q=%E2%98%80",
    `q=${"a".repeat(80)}`,
    ...productCategories.map((category) => `category=${category}`),
    "q=&category=office",
    "q=lamp&category=office",
  ])("rejects a well-formed unsupported query: %s", async (query) => {
    const response = await request(app).get(`/api/products?${query}`).expect(400);
    expect(response.body).toEqual(unsupportedExample);
  });

  it.each([
    "q=&q=",
    "q=lamp&q=desk",
    "category=home&category=office",
    "q[]=lamp",
    "q[text]=lamp",
    "category[]=office",
    "sort=price",
    "unknown=1",
    "__proto__=x",
    "constructor=x",
    "q=lamp&unknown=1",
    "category=unknown",
    "category=",
    "q=lamp&category=unknown",
    `q=${"a".repeat(81)}`,
    "q=%ZZ",
    "q=%",
    "q=%C0%AF",
    "q=%E0%A4%A",
    "%ZZ=value",
  ])("validates malformed or unknown input before feature support: %s", async (query) => {
    const response = await request(app)
      .get(`/api/products?${query}`)
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("matches the unknown-parameter example", async () => {
    const response = await request(app).get("/api/products?sort=price").expect(400);
    expect(response.body).toEqual(validationExample);
  });

  it.each([
    "/health?q=",
    "/ready?category=office",
    "/api/products/aurora-desk-lamp?q=",
  ])("does not silently ignore parameters on %s", async (path) => {
    const response = await request(app).get(path).expect(400);
    expect(response.body).toEqual(validationExample);
  });
});

describe("product ID validation", () => {
  it.each([
    "UPPERCASE",
    "bad_id",
    "bad%20id",
    "-leading",
    "trailing-",
    "two--hyphens",
    "a".repeat(121),
    "%2F",
    "%00",
    "%ZZ",
    "%E0%A4%A",
  ])("rejects the malformed product ID %s", async (id) => {
    const response = await request(app).get(`/api/products/${id}`).expect(400);
    expect(response.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});

describe("health and readiness", () => {
  it("reports process liveness and available catalogue data separately", async () => {
    const health = await request(app).get("/health").expect(200);
    const ready = await request(app).get("/ready").expect(200);
    expect(health.body).toEqual(healthExample);
    expect(ready.body).toEqual(readyExample);
  });

  it.each([
    { reason: "empty data", items: [] },
    { reason: "invalid data", items: [{ ...product, priceCents: -1 }] },
    { reason: "duplicate IDs", items: [product, product] },
  ])("stays live but not ready with $reason", async ({ items }) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unavailableApp = createApp(items);
    const health = await request(unavailableApp).get("/health").expect(200);
    const ready = await request(unavailableApp).get("/ready").expect(503);
    expect(health.body).toEqual(healthExample);
    expect(ready.body).toEqual(notReadyExample);
    expect(log).toHaveBeenCalledWith(
      "catalogue_not_ready: empty, invalid, or duplicate product data",
    );
  });
});
