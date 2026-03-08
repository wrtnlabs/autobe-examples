import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductImageAtSummaryTransformer } from "./ShoppingMallProductImageAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
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
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        images: ShoppingMallProductImageAtSummaryTransformer.select(),
        variants: ShoppingMallProductVariantAtSummaryTransformer.select(),
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
  ): Promise<IShoppingMallProduct> {
    const activeReviews = input.reviews.filter((r) => r.deleted_at === null);
    const averageRating =
      activeReviews.length > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
          activeReviews.length
        : null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        ShoppingMallProductImageAtSummaryTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        ShoppingMallProductVariantAtSummaryTransformer.transform,
      ),
      average_rating: averageRating,
      total_review_count: activeReviews.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
