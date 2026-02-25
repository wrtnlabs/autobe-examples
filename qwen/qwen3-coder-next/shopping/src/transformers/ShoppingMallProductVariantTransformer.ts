import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_product_id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        optionValues: {
          select: {
            option_value: true,
          },
        } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_deleted: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                created_at: true,
              },
            } satisfies Prisma.shopping_mall_sellersFindFirstArgs,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_category_id: true,
              },
            } satisfies Prisma.shopping_mall_categoriesFindFirstArgs,
            reviews: {
              select: {
                rating: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_productsFindFirstArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant> {
    const nonDeletedReviews = input.product.reviews.filter(
      (review) => review.deleted_at === null,
    );
    const avgRating =
      nonDeletedReviews.length > 0
        ? Math.round(
            nonDeletedReviews.reduce((sum, r) => sum + r.rating, 0) /
              nonDeletedReviews.length,
          )
        : 0;
    return {
      id: input.id,
      shoppingMallProductId: input.shopping_mall_product_id,
      skuCode: input.sku_code,
      priceOverride: input.price_override ?? undefined,
      stockQuantity: input.stock_quantity,
      optionValues: input.optionValues.map((item) => item.option_value),
      product: {
        id: input.product.id,
        name: input.product.name,
        base_price: input.product.base_price,
        is_deleted: input.product.is_deleted,
        seller: {
          id: input.product.seller.id,
          shop_name: input.product.seller.shop_name,
          approval_status: input.product.seller.approval_status,
          created_at: input.product.seller.created_at.toISOString(),
        },
        category: {
          id: input.product.category.id,
          name: input.product.category.name,
          description: input.product.category.description ?? null,
          parent: input.product.category.parent_category_id
            ? {
                id: input.product.category.id,
                name: input.product.category.name,
                description: input.product.category.description ?? null,
                parent: null,
                subcategory_count: 0,
              }
            : null,
          subcategory_count: 0,
        },
        average_rating: avgRating,
      },
    };
  }
}
