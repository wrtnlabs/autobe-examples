import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAnalyticsProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceReview> {
  // First verify the product exists
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get review statistics using database aggregations
  const reviewStats = await MyGlobal.prisma.ecommerce_reviews.aggregate({
    where: {
      ecommerce_product_id: props.productId,
      is_deleted: false,
    },
    _count: { id: true },
    _avg: { rating: true },
  });
  // Get rating distribution
  const ratingDistribution = await MyGlobal.prisma.ecommerce_reviews.groupBy({
    by: ["rating"],
    where: {
      ecommerce_product_id: props.productId,
      is_deleted: false,
    },
    _count: { id: true },
  });
  // Calculate helpful votes ratio
  const helpfulVotesResult =
    await MyGlobal.prisma.ecommerce_review_votes.groupBy({
      by: ["helpful"],
      where: {
        review: {
          ecommerce_product_id: props.productId,
          is_deleted: false,
        },
      },
      _count: { id: true },
    });
  // Get recent trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
  const recentStats = await MyGlobal.prisma.ecommerce_reviews.aggregate({
    where: {
      ecommerce_product_id: props.productId,
      is_deleted: false,
      created_at: { gte: thirtyDaysAgoISO },
    },
    _count: { id: true },
    _avg: { rating: true },
  });
  const recentHelpfulVotes = await MyGlobal.prisma.ecommerce_review_votes.count(
    {
      where: {
        helpful: true,
        created_at: { gte: thirtyDaysAgoISO },
        review: {
          ecommerce_product_id: props.productId,
          is_deleted: false,
        },
      },
    },
  );
  // Transform rating distribution
  const distributionMap = ratingDistribution.reduce(
    (acc, item) => {
      acc[item.rating] = item._count.id;
      return acc;
    },
    {} as Record<number, number>,
  );
  // Transform helpful votes ratio
  const helpfulCount =
    helpfulVotesResult.find((v) => v.helpful === true)?._count.id ?? 0;
  const totalVotes = helpfulVotesResult.reduce(
    (sum, v) => sum + v._count.id,
    0,
  );
  const helpfulRatio = totalVotes > 0 ? helpfulCount / totalVotes : null;
  // Build the analytics response
  return {
    average_rating: (Math.round((reviewStats._avg.rating ?? 0) * 100) /
      100) as number & tags.Minimum<1> & tags.Maximum<5>,
    rating_distribution: {
      one_star: distributionMap[1] ?? 0,
      two_stars: distributionMap[2] ?? 0,
      three_stars: distributionMap[3] ?? 0,
      four_stars: distributionMap[4] ?? 0,
      five_stars: distributionMap[5] ?? 0,
    },
    total_reviews: reviewStats._count.id,
    recent_trends: {
      last_30_days: recentStats._count.id,
      average_rating_last_30_days:
        recentStats._count.id > 0
          ? ((Math.round((recentStats._avg.rating ?? 0) * 100) /
              100) as number & tags.Minimum<1> & tags.Maximum<5>)
          : null,
      helpful_votes_last_30_days: recentHelpfulVotes,
    },
    helpful_votes_ratio: helpfulRatio as
      | (number & tags.Minimum<0> & tags.Maximum<1>)
      | null,
  };
}
