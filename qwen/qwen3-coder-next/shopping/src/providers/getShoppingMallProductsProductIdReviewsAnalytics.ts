import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshotAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdReviewsAnalytics(props: {
  productId: string;
}): Promise<IShoppingMallReviewSnapshotAnalytic> {
  // Find product to verify existence
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  // Get pre-calculated rating metrics if available
  const precalculatedMetrics =
    await MyGlobal.prisma.shopping_mall_product_review_ratings.findUnique({
      where: { product_id: props.productId },
    });
  // Get all non-deleted reviews for this product by joining through order_item
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: {
      orderItem: {
        shopping_mall_product_id: props.productId,
      },
    },
    select: {
      rating: true,
    },
  });
  // Calculate rating distribution
  const ratingCounts = {
    star_1: 0,
    star_2: 0,
    star_3: 0,
    star_4: 0,
    star_5: 0,
  };
  let totalRatingScore = 0;
  for (const review of reviews) {
    switch (review.rating) {
      case 1:
        ratingCounts.star_1++;
        break;
      case 2:
        ratingCounts.star_2++;
        break;
      case 3:
        ratingCounts.star_3++;
        break;
      case 4:
        ratingCounts.star_4++;
        break;
      case 5:
        ratingCounts.star_5++;
        break;
    }
    totalRatingScore += review.rating;
  }
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? totalRatingScore / totalReviews : 0;
  // For temporal analysis, use current timestamp as placeholder since reviews don't have created_at
  const currentTime = toISOStringSafe(new Date());
  const currentDateString = currentTime.split("T")[0];
  const temporalAnalysis = [
    {
      date: currentDateString as string & tags.Format<"date-time">,
      review_count: totalReviews,
      average_rating: totalReviews > 0 ? totalRatingScore / totalReviews : 0,
    },
  ];
  return {
    product_id: props.productId as string & tags.Format<"uuid">,
    average_rating: averageRating,
    review_count: totalReviews,
    rating_distribution: ratingCounts,
    temporal_analysis: {
      recent_trends: temporalAnalysis,
    },
    created_at: precalculatedMetrics?.created_at
      ? (toISOStringSafe(precalculatedMetrics.created_at) as string &
          tags.Format<"date-time">)
      : null,
    updated_at: precalculatedMetrics?.updated_at
      ? (toISOStringSafe(precalculatedMetrics.updated_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
