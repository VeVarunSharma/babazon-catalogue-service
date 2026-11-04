import assert from "node:assert/strict";
import listExample from "../contracts/examples/products-list.json" with { type: "json" };
import detailExample from "../contracts/examples/product-detail.json" with { type: "json" };
import healthExample from "../contracts/examples/health.json" with { type: "json" };
import readyExample from "../contracts/examples/ready.json" with { type: "json" };
import unsupportedExample from "../contracts/examples/unsupported-query.json" with { type: "json" };
import validationExample from "../contracts/examples/validation-error.json" with { type: "json" };
import notFoundExample from "../contracts/examples/not-found.json" with { type: "json" };

const port = process.env.PORT ?? "3001";
assert.match(port, /^\d+$/, "PORT must be a whole number.");
assert.ok(Number(port) >= 1 && Number(port) <= 65535, "PORT must be between 1 and 65535.");
const baseUrl = `http://127.0.0.1:${port}`;

const cases = [
  ["/health", 200, healthExample],
  ["/ready", 200, readyExample],
  ["/api/products", 200, listExample],
  ["/api/products?q=", 200, listExample],
  ["/api/products/aurora-desk-lamp", 200, detailExample],
  ["/api/products?q=lamp", 400, unsupportedExample],
  ["/api/products?category=office", 400, unsupportedExample],
  ["/api/products?q=lamp&category=office", 400, unsupportedExample],
  ["/api/products?sort=price", 400, validationExample],
  ["/api/products?q=&q=", 400, {
    error: { code: "VALIDATION_ERROR", message: "Query parameters must not be repeated." },
  }],
  ["/api/products?q=%ZZ", 400, {
    error: { code: "VALIDATION_ERROR", message: "Request URL must use valid percent encoding." },
  }],
  ["/api/products/not-a-product", 404, notFoundExample],
  ["/missing-route", 404, {
    error: { code: "NOT_FOUND", message: "Route was not found." },
  }],
] as const;

for (const [path, status, expected] of cases) {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(response.status, status, `${path}: HTTP status`);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  const body: unknown = await response.json();
  assert.deepEqual(body, expected, `${path}: response body`);
  console.info(`PASS ${status} GET ${path}`);
}

console.info(`${cases.length} HTTP smoke checks passed against ${baseUrl}`);
