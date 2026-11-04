import { Ajv2020 } from "ajv/dist/2020.js";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import { isCatalogueReady, products } from "../src/server/catalogue.js";
import { productCategories, productSchema } from "../src/shared/contracts.js";
import schema from "../contracts/catalogue-v1.schema.json" with { type: "json" };
import listExample from "../contracts/examples/products-list.json" with { type: "json" };
import detailExample from "../contracts/examples/product-detail.json" with { type: "json" };
import healthExample from "../contracts/examples/health.json" with { type: "json" };
import readyExample from "../contracts/examples/ready.json" with { type: "json" };
import unsupportedExample from "../contracts/examples/unsupported-query.json" with { type: "json" };
import validationExample from "../contracts/examples/validation-error.json" with { type: "json" };
import notFoundExample from "../contracts/examples/not-found.json" with { type: "json" };
import notReadyExample from "../contracts/examples/not-ready.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true });
const validateResponse = ajv.compile(schema);
const definition = (name: keyof typeof schema.$defs) => {
  const validate = ajv.getSchema(`${schema.$id}#/$defs/${name}`);
  if (!validate) {
    throw new Error(`Missing contract definition: ${name}`);
  }
  return validate;
};

describe("versioned contract and examples", () => {
  it.each([
    ["ProductListResponse", listExample],
    ["ProductDetailResponse", detailExample],
    ["HealthResponse", healthExample],
    ["ReadyResponse", readyExample],
    ["ApiError", unsupportedExample],
    ["ApiError", validationExample],
    ["ApiError", notFoundExample],
    ["ApiError", notReadyExample],
  ] as const)("validates the %s example", (name, example) => {
    const validate = definition(name);
    const valid = validate(example);
    expect(valid, JSON.stringify(validate.errors)).toBe(true);
    expect(validateResponse(example), JSON.stringify(validateResponse.errors)).toBe(true);
  });

  it("pins every product field, order, and all four categories", () => {
    expect(products).toEqual(listExample.items);
    expect(products).toHaveLength(8);
    expect(new Set(products.map((product) => product.id)).size).toBe(8);
    expect(productCategories).toEqual(listExample.categories);
    expect(new Set(products.map((product) => product.category))).toEqual(
      new Set(productCategories),
    );
    expect(listExample.total).toBe(listExample.items.length);
    expect(detailExample.product).toEqual(listExample.items[0]);
    expect(isCatalogueReady(products)).toBe(true);
    for (const product of products) {
      expect(productSchema.safeParse(product).success).toBe(true);
      expect(definition("Product")(product)).toBe(true);
    }
  });

  it.each([
    { ...detailExample.product, id: "INVALID" },
    { ...detailExample.product, id: "a".repeat(121) },
    { ...detailExample.product, shortDescription: undefined },
    { ...detailExample.product, category: "unknown" },
    { ...detailExample.product, priceCents: "4299" },
    { ...detailExample.product, priceCents: 42.99 },
    { ...detailExample.product, priceCents: -1 },
    { ...detailExample.product, priceCents: Number.MAX_SAFE_INTEGER + 1 },
    { ...detailExample.product, rating: 5.1 },
    { ...detailExample.product, reviewCount: -1 },
    { ...detailExample.product, availability: "unknown" },
    { ...detailExample.product, badge: null },
    { ...detailExample.product, features: [""] },
    { ...detailExample.product, accent: "" },
    { ...detailExample.product, unexpected: true },
  ])("rejects invalid products in both wire and runtime schemas: %j", (product) => {
    expect(definition("Product")(product)).toBe(false);
    expect(productSchema.safeParse(product).success).toBe(false);
  });

  it.each([
    { ...listExample, query: { q: "lamp" } },
    { ...listExample, query: { q: "", category: "office" } },
    { ...listExample, total: "8" },
    { ...listExample, categories: ["home", "home", "office", "kitchen"] },
    { ...listExample, unexpected: true },
  ])("rejects a response outside the published starter contract: %j", (response) => {
    expect(definition("ProductListResponse")(response)).toBe(false);
  });

  it.each([
    ["/health", 200, "HealthResponse"],
    ["/ready", 200, "ReadyResponse"],
    ["/api/products", 200, "ProductListResponse"],
    ["/api/products/aurora-desk-lamp", 200, "ProductDetailResponse"],
    ["/api/products?q=lamp", 400, "ApiError"],
    ["/api/products?sort=price", 400, "ApiError"],
    ["/api/products?category=unknown", 400, "ApiError"],
    ["/api/products/not-a-product", 404, "ApiError"],
  ] as const)("checks the actual HTTP envelope for %s", async (path, status, name) => {
    const response = await request(createApp()).get(path).expect(status);
    const body: unknown = response.body;
    const validate = definition(name);
    const valid = validate(body);
    expect(valid, JSON.stringify(validate.errors)).toBe(true);
  });
});
