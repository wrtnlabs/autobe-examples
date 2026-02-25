import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        description: true,
        base_price: true,
        is_deleted: true,
        deleted_at: true,
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
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    const nonDeletedReviews = input.reviews.filter(
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
      name: input.name,
      base_price: input.base_price,
      is_deleted: input.is_deleted,
      seller: {
        id: input.seller.id,
        shop_name: input.seller.shop_name,
        approval_status: input.seller.approval_status,
        created_at: toISOStringSafe(input.seller.created_at),
      },
      category: {
        id: input.category.id,
        name: input.category.name,
        description: input.category.description ?? null,
        parent: input.category.parent_category_id
          ? {
              id: input.category.id,
              name: input.category.name,
              description: input.category.description ?? null,
              parent: null,
              subcategory_count: 0,
            }
          : null,
        subcategory_count: 0,
      },
      average_rating: avgRating,
    };
  }
}
