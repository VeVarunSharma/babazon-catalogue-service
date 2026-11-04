import { z } from "zod";

export const productCategories = [
  "home",
  "outdoors",
  "office",
  "kitchen",
] as const;

export const fieldLimits = { search: 80, productId: 120 } as const;

export const productIdSchema = z
  .string()
  .min(1)
  .max(fieldLimits.productId)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase product slug.");

export const productSchema = z.strictObject({
  id: productIdSchema,
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(productCategories),
  priceCents: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  availability: z.enum(["in-stock", "limited"]),
  badge: z.string().min(1).optional(),
  features: z.array(z.string().min(1)),
  accent: z.string().min(1),
});

export const productQuerySchema = z.strictObject({
  q: z.string().max(fieldLimits.search).optional().default(""),
  category: z.enum(productCategories).optional(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductCategory = (typeof productCategories)[number];
export type ProductQuery = z.infer<typeof productQuerySchema>;

export interface ProductListResponse {
  items: Product[];
  total: number;
  query: { q: "" };
  categories: ProductCategory[];
}

export interface ProductDetailResponse {
  product: Product;
}

export interface HealthResponse {
  status: "ok";
}

export interface ReadyResponse {
  status: "ready";
}

export interface ApiError {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "UNSUPPORTED_QUERY"
      | "NOT_FOUND"
      | "NOT_READY"
      | "INTERNAL_ERROR";
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
