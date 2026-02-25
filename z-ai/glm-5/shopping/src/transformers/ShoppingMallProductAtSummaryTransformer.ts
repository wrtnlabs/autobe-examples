import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
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
        created_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        variants: {
          select: {
            price: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        images: {
          select: {
            url: true,
          },
          orderBy: {
            order: "asc" as const,
          },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
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
  ): Promise<IShoppingMallProduct.ISummary> {
    const variantPrices = input.variants.map(
      (v) => v.price ?? input.base_price,
    );
    const minPrice =
      variantPrices.length > 0 ? Math.min(...variantPrices) : input.base_price;
    const maxPrice =
      variantPrices.length > 0 ? Math.max(...variantPrices) : input.base_price;
    const activeReviews = input.reviews;
    const averageRating =
      activeReviews.length > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
          activeReviews.length
        : null;
    const mainImageUrl =
      input.images.length > 0 ? input.images[0].url : undefined;
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      min_price: variantPrices.length > 0 ? minPrice : undefined,
      max_price: variantPrices.length > 0 ? maxPrice : undefined,
      main_image_url: mainImageUrl,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      average_rating: averageRating,
      review_count: activeReviews.length,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallProduct.ISummary;
  }
}
