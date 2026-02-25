import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentVoteScoreAtSummaryTransformer } from "../transformers/CommunityPlatformCommentVoteScoreAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentsVoteScores(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentVoteScore.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteScore.ISummary> {
  const { body } = props;
  // Helper function to validate and convert ISO date strings
  const parseDateString = (
    dateString: string | undefined,
  ): Date | undefined => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new HttpException(`Invalid date format: ${dateString}`, 400);
    }
    return date;
  };
  // Build WHERE conditions
  const whereInput: Prisma.community_platform_comment_vote_scoresWhereInput = {
    // Score range filters
    ...(body.minimum_score !== undefined && {
      score: { gte: body.minimum_score },
    }),
    ...(body.maximum_score !== undefined && {
      score: { lte: body.maximum_score },
    }),
    // Vote count filters
    ...(body.minimum_upvotes !== undefined && {
      upvote_count: { gte: body.minimum_upvotes },
    }),
    ...(body.minimum_downvotes !== undefined && {
      downvote_count: { gte: body.minimum_downvotes },
    }),
    // Time-based filters
    ...(body.created_after !== undefined && {
      created_at: { gte: parseDateString(body.created_after) },
    }),
    ...(body.created_before !== undefined && {
      created_at: { lte: parseDateString(body.created_before) },
    }),
    ...(body.updated_after !== undefined && {
      last_updated_at: { gte: parseDateString(body.updated_after) },
    }),
    ...(body.updated_before !== undefined && {
      last_updated_at: { lte: parseDateString(body.updated_before) },
    }),
    // Comment content filter (requires JOIN)
    ...(body.comment_content !== undefined && {
      comment: {
        content: { contains: body.comment_content, mode: "insensitive" },
        deleted_at: null, // Only include non-deleted comments
      },
    }),
  };
  // Pagination setup
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting setup with type safety
  const orderByInput = (() => {
    const validSortFields = [
      "score",
      "upvote_count",
      "last_updated_at",
    ] as const;
    const sortField =
      body.sort_by &&
      validSortFields.includes(body.sort_by as (typeof validSortFields)[number])
        ? body.sort_by
        : "last_updated_at";
    const sortDirection = body.sort_order === "asc" ? "asc" : "desc";
    return {
      [sortField]: sortDirection,
    } satisfies Prisma.community_platform_comment_vote_scoresOrderByWithRelationInput;
  })();
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_vote_scores.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommentVoteScoreAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_comment_vote_scores.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentVoteScoreAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
