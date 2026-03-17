import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdReviewStats(props: {
  productId: string;
}): Promise<IShoppingMallReview.IStat> {
  // Verify product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get aggregation data
  const [totalCount, avgResult, distribution] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.count({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.aggregate({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    }),
  ]);
  // Build rating distribution (ensure all 5 ratings are present)
  const ratingDistribution: IShoppingMallReview.IRatingDistribution[] = [
    1, 2, 3, 4, 5,
  ].map((rating) => {
    const found = distribution.find((d) => d.rating === rating);
    return {
      rating,
      count: found?._count.rating ?? 0,
    } satisfies IShoppingMallReview.IRatingDistribution;
  });
  // Calculate average rating (rounded to 2 decimal places)
  // The database ensures rating is always 1-5, so average will be in valid range
  const averageRating =
    avgResult._avg.rating !== null
      ? Math.round(avgResult._avg.rating * 100) / 100
      : null;
  return {
    averageRating,
    totalReviews: totalCount,
    ratingDistribution,
  } satisfies IShoppingMallReview.IStat;
}
