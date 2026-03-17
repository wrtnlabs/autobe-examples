import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductImageTransformer } from "./ShoppingMallProductImageTransformer";
import { ShoppingMallProductVariantTransformer } from "./ShoppingMallProductVariantTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        images: ShoppingMallProductImageTransformer.select(),
        variants: ShoppingMallProductVariantTransformer.select(),
        reviews: {
          select: {
            rating: true,
          },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      base_price: input.base_price,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        ShoppingMallProductVariantTransformer.transform,
      ),
      reviewStatistic: {
        averageRating:
          input.reviews.length > 0
            ? input.reviews.reduce((sum, r) => sum + r.rating, 0) /
              input.reviews.length
            : null,
        totalReviewCount: input.reviews.length,
        ratingDistribution: {
          "1": input.reviews.filter((r) => r.rating === 1).length,
          "2": input.reviews.filter((r) => r.rating === 2).length,
          "3": input.reviews.filter((r) => r.rating === 3).length,
          "4": input.reviews.filter((r) => r.rating === 4).length,
          "5": input.reviews.filter((r) => r.rating === 5).length,
        },
      },
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
