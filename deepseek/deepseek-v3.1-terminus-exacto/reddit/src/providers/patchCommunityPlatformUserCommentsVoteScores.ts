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
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentVoteScoreAtSummaryTransformer } from "../transformers/CommunityPlatformCommentVoteScoreAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommentsVoteScores(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentVoteScore.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteScore.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for comment vote scores
  const whereInput: Prisma.community_platform_comment_vote_scoresWhereInput = {
    AND: [
      props.body.minimum_score !== undefined
        ? { score: { gte: props.body.minimum_score } }
        : {},
      props.body.maximum_score !== undefined
        ? { score: { lte: props.body.maximum_score } }
        : {},
      props.body.minimum_upvotes !== undefined
        ? { upvote_count: { gte: props.body.minimum_upvotes } }
        : {},
      props.body.minimum_downvotes !== undefined
        ? { downvote_count: { gte: props.body.minimum_downvotes } }
        : {},
      props.body.created_after !== undefined
        ? { created_at: { gte: props.body.created_after } }
        : {},
      props.body.created_before !== undefined
        ? { created_at: { lte: props.body.created_before } }
        : {},
      props.body.updated_after !== undefined
        ? { last_updated_at: { gt: props.body.updated_after } }
        : {},
      props.body.updated_before !== undefined
        ? { last_updated_at: { lt: props.body.updated_before } }
        : {},
    ].filter((condition) => Object.keys(condition).length > 0),
  };
  // Handle comment content filtering with JOIN
  if (props.body.comment_content !== undefined) {
    whereInput.comment = {
      content: { contains: props.body.comment_content, mode: "insensitive" },
    };
  }
  // Build order by clause with proper type safety
  const sortField = props.body.sort_by ?? "last_updated_at";
  const sortDirection = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.community_platform_comment_vote_scoresOrderByWithRelationInput =
    sortField === "score"
      ? { score: sortDirection }
      : sortField === "upvote_count"
        ? { upvote_count: sortDirection }
        : { last_updated_at: sortDirection };
  // Execute sequentially to avoid parallel query issues
  const data =
    await MyGlobal.prisma.community_platform_comment_vote_scores.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommentVoteScoreAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_comment_vote_scores.count({
      where: whereInput,
    });
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
    },
  };
}
