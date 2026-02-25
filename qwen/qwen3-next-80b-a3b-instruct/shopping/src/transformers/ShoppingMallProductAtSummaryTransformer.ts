import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        images: {
          select: {
            image_url: true,
            position: true,
          },
          orderBy: {
            position: "asc",
          },
          take: 1,
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        reviews: {
          select: {
            rating: true,
            is_deleted: true,
          },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      main_image_url: input.images[0]?.image_url ?? undefined,
      avg_rating:
        input.reviews.filter((r) => !r.is_deleted).length > 0
          ? Number(
              (
                input.reviews
                  .filter((r) => !r.is_deleted)
                  .reduce((sum, r) => sum + r.rating, 0) /
                input.reviews.filter((r) => !r.is_deleted).length
              ).toFixed(1),
            )
          : undefined,
      review_count:
        input.reviews.filter((r) => !r.is_deleted).length || undefined,
    };
  }
}
