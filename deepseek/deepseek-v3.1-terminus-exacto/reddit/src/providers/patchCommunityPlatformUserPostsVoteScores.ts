import { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostVoteScoreAtSummaryTransformer } from "../transformers/CommunityPlatformPostVoteScoreAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPostsVoteScores(props: {
  user: UserPayload;
  body: ICommunityPlatformPostVoteScore.IRequest;
}): Promise<IPageICommunityPlatformPostVoteScore.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for vote score filters
  const whereInput: Prisma.community_platform_post_vote_scoresWhereInput = {
    AND: [
      ...(props.body.min_total_score !== undefined
        ? [{ total_score: { gte: props.body.min_total_score } }]
        : []),
      ...(props.body.max_total_score !== undefined
        ? [{ total_score: { lte: props.body.max_total_score } }]
        : []),
      ...(props.body.min_upvote_count !== undefined
        ? [{ upvote_count: { gte: props.body.min_upvote_count } }]
        : []),
      ...(props.body.max_upvote_count !== undefined
        ? [{ upvote_count: { lte: props.body.max_upvote_count } }]
        : []),
      ...(props.body.min_downvote_count !== undefined
        ? [{ downvote_count: { gte: props.body.min_downvote_count } }]
        : []),
      ...(props.body.max_downvote_count !== undefined
        ? [{ downvote_count: { lte: props.body.max_downvote_count } }]
        : []),
      ...(props.body.start_last_updated_at !== undefined
        ? [{ last_updated_at: { gte: props.body.start_last_updated_at } }]
        : []),
      ...(props.body.end_last_updated_at !== undefined
        ? [{ last_updated_at: { lte: props.body.end_last_updated_at } }]
        : []),
    ].filter(Boolean),
  };
  // Handle text search by joining with posts table
  if (props.body.search) {
    whereInput.post = {
      title: { contains: props.body.search, mode: "insensitive" },
    };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_vote_scores.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { last_updated_at: "desc" },
      ...CommunityPlatformPostVoteScoreAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_post_vote_scores.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformPostVoteScoreAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
