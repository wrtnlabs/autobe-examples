import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReview.IUpdate;
}): Promise<IEcommerceReview> {
  // Verify review exists and belongs to customer
  const review = await MyGlobal.prisma.ecommerce_reviews.findFirstOrThrow({
    where: {
      id: props.reviewId,
      ecommerce_customer_id: props.customer.id,
      ecommerce_product_id: props.productId,
      is_deleted: false,
    },
  });
  const now = new Date().toISOString();
  // Create snapshot before update
  await MyGlobal.prisma.ecommerce_review_edits.create({
    data: {
      id: v4(),
      ecommerce_review_id: props.reviewId,
      ecommerce_customer_id: props.customer.id,
      edited_at: new Date(now),
      rating_before: review.rating,
      rating_after: props.body.rating ?? review.rating,
      content_before: review.content ?? "",
      content_after: props.body.content ?? review.content ?? "",
      created_at: new Date(now),
    },
  });
  await MyGlobal.prisma.ecommerce_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.rating !== undefined && { rating: props.body.rating }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(now),
    },
  });
  // Calculate product analytics
  const reviews = await MyGlobal.prisma.ecommerce_reviews.findMany({
    where: {
      ecommerce_product_id: props.productId,
      is_deleted: false,
    },
    select: { rating: true, created_at: true },
  });
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
  const ratingDistribution = {
    one_star: reviews.filter((r) => r.rating === 1).length,
    two_stars: reviews.filter((r) => r.rating === 2).length,
    three_stars: reviews.filter((r) => r.rating === 3).length,
    four_stars: reviews.filter((r) => r.rating === 4).length,
    five_stars: reviews.filter((r) => r.rating === 5).length,
  };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReviews = reviews.filter((r) => r.created_at > thirtyDaysAgo);
  const recentAvgRating =
    recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) /
        recentReviews.length
      : null;
  // Get helpful votes data
  const votesResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      total_votes: bigint;
      helpful_votes: bigint;
    }>
  >`
    SELECT 
      COUNT(*) as total_votes,
      COUNT(CASE WHEN is_helpful THEN 1 END) as helpful_votes
    FROM ecommerce_review_votes 
    WHERE ecommerce_review_id IN (
      SELECT id FROM ecommerce_reviews 
      WHERE ecommerce_product_id = ${props.productId} AND is_deleted = false
    )
  `;
  const helpfulVotesRatio =
    votesResult[0].total_votes > 0
      ? Number(votesResult[0].helpful_votes) /
        Number(votesResult[0].total_votes)
      : null;
  return {
    average_rating: parseFloat(averageRating.toFixed(2)) as number &
      tags.Minimum<1> &
      tags.Maximum<5>,
    rating_distribution: {
      one_star: ratingDistribution.one_star as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      two_stars: ratingDistribution.two_stars as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      three_stars: ratingDistribution.three_stars as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      four_stars: ratingDistribution.four_stars as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      five_stars: ratingDistribution.five_stars as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    total_reviews: totalReviews as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    recent_trends: {
      last_30_days: recentReviews.length as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      average_rating_last_30_days: recentAvgRating as
        | (number & tags.Minimum<1> & tags.Maximum<5>)
        | null,
      helpful_votes_last_30_days: 0 as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    helpful_votes_ratio: helpfulVotesRatio as
      | (number & tags.Minimum<0> & tags.Maximum<1>)
      | null,
  };
}
