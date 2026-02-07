import { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentVoteSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityCommentsVoteSummaries(props: {
  body: ICommunityCommentVoteSummary.IRequest;
}): Promise<IPageICommunityCommentVoteSummary> {
  const { sortAlgorithm, page = 1, limit = 100 } = props.body;
  // Validate sort algorithm - TypeScript enforces this via union type
  // Any non-conforming value would be caught at compile-time
  // Calculate pagination offsets
  const skip = (page - 1) * limit;
  // Build WHERE conditions (based on actual schema: only community_comment_id exists as a reference)
  // Note: community_comment_vote_summaries has no fields like created_at, community_post_id, community_member_id directly
  // These are stored in the referenced community_comments, so we cannot filter by them here
  // This materialized view only contains total_upvotes, total_downvotes, net_score, community_comment_id
  // There are no provided filter options beyond sortAlgorithm, page, limit
  // Per the DTO definition, no other filter fields are allowed in IRequest
  const whereInput: Prisma.community_comment_vote_summariesWhereInput = {};
  // Build ORDER BY clause based on sort algorithm
  const orderByInput: Prisma.community_comment_vote_summariesOrderByWithRelationInput =
    {
      ...(sortAlgorithm === "best" && { net_score: "desc" }),
      ...(sortAlgorithm === "controversial" && {
        total_upvotes: "desc",
        total_downvotes: "desc",
        net_score: "asc",
      }),
      ...(sortAlgorithm === "new" && {
        // Since internal schema has no created_at, we must fallback to 'id' as stable sort
        // The specification requires created_at DESC but schema doesn't include it
        // For production: Change schema to include created_at from referenced comment
        // For now: use id (which correlates with creation order)
        id: "desc",
      }),
    };
  // Fetch the data
  const data = await MyGlobal.prisma.community_comment_vote_summaries.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      total_upvotes: true,
      total_downvotes: true,
      net_score: true,
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.community_comment_vote_summaries.count({
    where: whereInput,
  });
  // Return paginated response - only fields defined in ICommunityCommentVoteSummary
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      total_upvotes: item.total_upvotes,
      total_downvotes: item.total_downvotes,
      net_score: item.net_score,
    })),
  };
}
