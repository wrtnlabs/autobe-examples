import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        brand_id: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        shopping_mall_product_secondary_categories: {
          select: {
            tag: true,
          },
        },
        shopping_mall_product_images: {
          select: {
            url: true,
            is_primary: true,
            display_order: true,
          },
        },
        shopping_mall_product_reviews: {
          select: {
            rating: true,
          },
        },
        shopping_mall_product_questions: {
          select: {
            content: true,
          },
        },
        shopping_mall_product_view_stats: {
          select: {
            view_count: true,
          },
        },
        shopping_mall_product_sales_stats: {
          select: {
            count: true,
          },
        },
        shopping_mall_product_snapshots: {
          select: {
            snapshot_number: true,
          },
        },
        shopping_mall_product_variants: {
          select: {
            quantity: true,
          },
        },
        shopping_mall_reviews: {
          select: {
            comment: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    // Get primary image URL (first is_primary image, or first image if none marked primary)
    const primaryImage =
      input.shopping_mall_product_images
        .filter((image) => image.is_primary)
        .shift() || input.shopping_mall_product_images.shift();
    // Tags from secondary categories
    const tags: string[] = input.shopping_mall_product_secondary_categories.map(
      (cat) => cat.tag,
    );
    // Calculate average rating
    const ratings = input.shopping_mall_product_reviews.map(
      (review) => review.rating,
    );
    const rating_average =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r, 0) * 10) / ratings.length,
          ) / 10
        : 0;
    // Check if in stock (any variant has quantity > 0)
    const in_stock = input.shopping_mall_product_variants.some(
      (variant) => variant.quantity > 0,
    );
    // Sum views count
    const views_count = input.shopping_mall_product_view_stats.reduce(
      (sum, stat) => sum + stat.view_count,
      0,
    );
    // Sum sales count
    const sales_count = input.shopping_mall_product_sales_stats.reduce(
      (sum, stat) => sum + stat.count,
      0,
    );
    return {
      id: input.id,
      name: input.name,
      price: Number(input.base_price),
      thumbnail_url: primaryImage ? primaryImage.url : "",
      category_id: input.category.id,
      brand_id: input.brand_id, // Assuming product has direct brand_id field
      tags: tags,
      views_count: views_count,
      sales_count: sales_count,
      rating_average: rating_average,
      reviews_count: input.shopping_mall_product_reviews.length,
      in_stock: in_stock,
    };
  }
}
