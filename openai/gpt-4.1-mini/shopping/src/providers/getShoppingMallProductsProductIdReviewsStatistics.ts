import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewProductReviewStatistic";
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
}): Promise<IShoppingMallProductReviewProductReviewStatistic> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);
  const variantRecords =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      select: { id: true },
    });
  const variantIds = variantRecords.map((variant) => variant.id);
  if (variantIds.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      starRatingCounts: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }
  const reviewGroups =
    await MyGlobal.prisma.shopping_mall_product_reviews.groupBy({
      by: ["rating"],
      where: {
        shopping_mall_product_variant_id: { in: variantIds },
        deleted_at: null,
      },
      _count: { rating: true },
    });
  const totalReviews = reviewGroups.reduce(
    (acc, group) => acc + group._count.rating,
    0,
  );
  const weightedSum = reviewGroups.reduce(
    (acc, group) => acc + group.rating * group._count.rating,
    0,
  );
  const averageRating = totalReviews > 0 ? weightedSum / totalReviews : 0;
  const starRatingCounts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const group of reviewGroups) {
    starRatingCounts[group.rating as keyof typeof starRatingCounts] =
      group._count.rating;
  }
  return {
    averageRating,
    totalReviews,
    starRatingCounts,
  };
}
