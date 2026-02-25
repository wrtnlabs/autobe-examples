import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceProductsProductIdReviewsReviewId(props: {
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IEcommerceReview> {
  // First verify the product exists
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get the specific review
  const review = await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      product: { id: props.productId },
    },
    ...EcommerceReviewAtSummaryTransformer.select(),
  });
  // Get analytics data for the product
  const allReviews = await MyGlobal.prisma.ecommerce_reviews.findMany({
    where: {
      product: { id: props.productId },
      deleted_at: null,
    },
    select: {
      rating: true,
      created_at: true,
    },
  });
  // Calculate analytics
  const average_rating = typia.assert<
    number & tags.Type<"float"> & tags.Minimum<1> & tags.Maximum<5>
  >(
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0,
  );
  // Calculate rating distribution as object with star counts
  const starRatings = [1, 2, 3, 4, 5];
  const rating_counts = starRatings.map(
    (stars) => allReviews.filter((r) => r.rating === stars).length,
  );
  const rating_distribution = {
    one_star: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      rating_counts[0],
    ),
    two_stars: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      rating_counts[1],
    ),
    three_stars: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      rating_counts[2],
    ),
    four_stars: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      rating_counts[3],
    ),
    five_stars: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      rating_counts[4],
    ),
  };
  const total_reviews = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >(allReviews.length);
  // Recent trends (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent_reviews = allReviews.filter((r) => r.created_at > thirtyDaysAgo);
  const recent_average =
    recent_reviews.length > 0
      ? recent_reviews.reduce((sum, r) => sum + r.rating, 0) /
        recent_reviews.length
      : null;
  const recent_trends = {
    last_30_days: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      recent_reviews.length,
    ),
    average_rating_last_30_days:
      recent_average !== null
        ? typia.assert<(number & tags.Minimum<1> & tags.Maximum<5>) | null>(
            recent_average,
          )
        : null,
    helpful_votes_last_30_days: typia.assert<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(0),
  };
  // Helpful votes ratio
  const helpful_votes_ratio = typia.assert<
    number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<1>
  >(0);
  const transformed =
    await EcommerceReviewAtSummaryTransformer.transform(review);
  // Construct full IEcommerceReview object
  return {
    ...transformed,
    average_rating,
    rating_distribution,
    total_reviews,
    recent_trends,
    helpful_votes_ratio,
  } satisfies IEcommerceReview as IEcommerceReview;
}
