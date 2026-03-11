import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IReviewAnalyticsResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsResponse";
import { IReviewAnalyticsReviewPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsReviewPreview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminReviewsAnalyticsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IReviewAnalyticsResponse> {
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: {
      id: props.productId,
      deleted_at: null,
      is_active: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: {
      product_id: props.productId,
      is_active: true,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
  });
  const totalCount = reviews.length;
  let averageRating: (number & tags.Minimum<0> & tags.Maximum<5>) | null = null;
  if (totalCount > 0) {
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    averageRating = Math.round((sum / totalCount) * 10) / 10;
  }
  const ratingDistribution = {
    rating5_count: 0,
    rating4_count: 0,
    rating3_count: 0,
    rating2_count: 0,
    rating1_count: 0,
  };
  for (const review of reviews) {
    switch (review.rating) {
      case 5:
        ratingDistribution.rating5_count++;
        break;
      case 4:
        ratingDistribution.rating4_count++;
        break;
      case 3:
        ratingDistribution.rating3_count++;
        break;
      case 2:
        ratingDistribution.rating2_count++;
        break;
      case 1:
        ratingDistribution.rating1_count++;
        break;
    }
  }
  const recentReviews = reviews.slice(0, 10).map((review) => ({
    id: review.id,
    rating: review.rating,
    textContent: review.text_content ?? null,
    createdAt: review.created_at.toISOString(),
  }));
  return {
    average_rating: averageRating,
    total_count: totalCount,
    rating_distribution: ratingDistribution,
    recent_reviews: recentReviews,
  };
}
