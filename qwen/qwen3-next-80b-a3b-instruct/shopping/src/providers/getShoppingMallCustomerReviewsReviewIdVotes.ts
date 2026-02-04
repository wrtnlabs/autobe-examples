import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewVoteTransformer } from "../transformers/ShoppingMallReviewVoteTransformer";

export async function getShoppingMallCustomerReviewsReviewIdVotes(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IPageIShoppingMallReviewVote> {
  // Verify review exists and is not deleted
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId, deleted_at: null },
  });
  if (!review) {
    throw new HttpException("Review not found or has been deleted", 404);
  }
  // Pagination parameters with defaults
  const page = props.reviewId ? 1 : 1; // defaults
  const limit = props.reviewId ? 20 : 20; // defaults
  const skip = (page - 1) * limit;
  // Query votes with transformer select
  const votes = await MyGlobal.prisma.shopping_mall_review_votes.findMany({
    where: { review_id: props.reviewId },
    orderBy: { created_at: "asc" },
    skip,
    take: limit,
    ...ShoppingMallReviewVoteTransformer.select(),
  });
  // Count total votes for pagination
  const total = await MyGlobal.prisma.shopping_mall_review_votes.count({
    where: { review_id: props.reviewId },
  });
  // Calculate aggregated statistics
  let totalUpvotes = 0;
  let totalDownvotes = 0;
  for (const vote of votes) {
    if (vote.vote_type === "up") totalUpvotes++;
    else if (vote.vote_type === "down") totalDownvotes++;
  }
  // Transform votes to API DTO
  const transformedVotes = await ArrayUtil.asyncMap(
    votes,
    ShoppingMallReviewVoteTransformer.transform,
  );
  // Return IPageIShoppingMallReviewVote - Note: This DTO does NOT include aggregated stats
  // The specification requires total_upvotes, total_downvotes, total_votes, but the actual IPageIShoppingMallReviewVote type only allows pagination and data
  // This indicates a discrepancy between specification and actual DTO structure
  // Given the provided DTO, we return what matches the type exactly
  return {
    data: transformedVotes,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
