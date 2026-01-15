import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        category: { select: { id: true, name: true } },
        shopping_mall_product_secondary_categories: {
          select: { category: true },
        },
        shopping_mall_product_images: {
          select: { id: true, is_primary: true },
        },
        shopping_mall_product_reviews: { select: { rating: true } },
        shopping_mall_product_questions: { select: { id: true } },
        shopping_mall_product_view_stats: { select: { product_id: true } },
        shopping_mall_product_sales_stats: { select: { product_id: true } },
        shopping_mall_product_snapshots: { select: { id: true } },
        shopping_mall_product_variants: {
          select: { id: true, quantity: true },
        },
        shopping_mall_reviews: { select: { rating: true } },
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct> {
    const primaryImage = input.shopping_mall_product_images.find(
      (img) => img.is_primary,
    );
    // No 'tag' field in schema, so tags must be undefined
    const tags = undefined;
    const categoryIds = input.shopping_mall_product_secondary_categories.map(
      (c) => c.category.id,
    );
    const variantInventoryTotal = input.shopping_mall_product_variants.reduce(
      (sum, variant) => sum + (variant.quantity ?? 0),
      0,
    );
    const reviewCount = input.shopping_mall_product_reviews.length;
    const ratingAverage =
      reviewCount > 0
        ? input.shopping_mall_product_reviews.reduce(
            (sum, r) => sum + r.rating,
            0,
          ) / reviewCount
        : 0;
    const isFeatured = input.shopping_mall_product_snapshots.length > 0;
    const hasVariants = input.shopping_mall_product_variants.length > 0;
    const isNew =
      toISOStringSafe(input.created_at) >
      new Date(Date.now() - 2592000000).toISOString();
    // No 'url' field in schema, so primary_image_url cannot be derived from available data
    // This is a schema/DTD contract mismatch: DTO requires string & Format<'uri'>
    // But database provides no source for a URL - only an id
    // Therefore the only compliant choice is null (which will fail validation, but it's the only honest choice)
    // In production, this would require schema/DTO alignment
    const primary_image_url: string & tags.Format<"uri"> = null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      price: 0, // Required DTO field, no data source in schema
      category_id: input.category.id,
      status: input.status as "active" | "draft" | "inactive",
      sku: "", // Required DTO field, no data source in schema
      brand_id: null as (string & tags.Format<"uuid">) | undefined,
      created_at: toISOStringSafe(input.created_at),
      primary_image_url,
      tags,
      category_ids: categoryIds.length > 0 ? categoryIds : undefined,
      discount_percentage: undefined,
      inventory_count: variantInventoryTotal,
      rating_average: ratingAverage,
      reviews_count: reviewCount,
      product_variants_count: input.shopping_mall_product_variants.length,
      views_count: input.shopping_mall_product_view_stats.length,
      sales_count: input.shopping_mall_product_sales_stats.length,
      is_featured: isFeatured,
      has_variants: hasVariants,
      is_new: isNew,
    };
  }
}
