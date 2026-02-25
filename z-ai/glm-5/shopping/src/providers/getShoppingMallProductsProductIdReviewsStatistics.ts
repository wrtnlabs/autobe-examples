import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdReviewsStatistics(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewStatistic> {
  // Verify product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get total count and average rating
  const aggregateResult = await MyGlobal.prisma.shopping_mall_reviews.aggregate(
    {
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        id: true,
      },
      _avg: {
        rating: true,
      },
    },
  );
  // Get rating distribution
  const distributionResult =
    await MyGlobal.prisma.shopping_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    });
  // Build rating distribution object
  const ratingDistribution: IShoppingMallReviewStatistic["ratingDistribution"] =
    {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
  for (const item of distributionResult) {
    const ratingKey = String(item.rating) as "1" | "2" | "3" | "4" | "5";
    ratingDistribution[ratingKey] = item._count.rating;
  }
  // Calculate average rating rounded to 2 decimal places
  const averageRating =
    aggregateResult._avg.rating !== null
      ? Math.round(aggregateResult._avg.rating * 100) / 100
      : null;
  return {
    averageRating,
    totalReviewCount: aggregateResult._count.id,
    ratingDistribution,
  };
}
