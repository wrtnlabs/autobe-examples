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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostVoteScoreAtSummaryTransformer } from "../transformers/CommunityPlatformPostVoteScoreAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostsVoteScores(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPostVoteScore.IRequest;
}): Promise<IPageICommunityPlatformPostVoteScore.ISummary> {
  // 1. 解析分页参数
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 2. 构建WHERE条件
  const whereInput = {
    // Removed deleted_at property as it doesn't exist in the Prisma model
    ...(props.body.min_total_score !== undefined && {
      total_score: { gte: props.body.min_total_score },
    }),
    ...(props.body.max_total_score !== undefined && {
      total_score: { lte: props.body.max_total_score },
    }),
    ...(props.body.min_upvote_count !== undefined && {
      upvote_count: { gte: props.body.min_upvote_count },
    }),
    ...(props.body.max_upvote_count !== undefined && {
      upvote_count: { lte: props.body.max_upvote_count },
    }),
    ...(props.body.min_downvote_count !== undefined && {
      downvote_count: { gte: props.body.min_downvote_count },
    }),
    ...(props.body.max_downvote_count !== undefined && {
      downvote_count: { lte: props.body.max_downvote_count },
    }),
    ...(props.body.start_last_updated_at !== undefined && {
      last_updated_at: { gte: new Date(props.body.start_last_updated_at) },
    }),
    ...(props.body.end_last_updated_at !== undefined && {
      last_updated_at: { lte: new Date(props.body.end_last_updated_at) },
    }),
    // 处理搜索（如果需要JOIN post表）
    ...(props.body.search && {
      post: {
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      },
    }),
  } satisfies Prisma.community_platform_post_vote_scoresWhereInput;
  // 3. 执行查询和数据转换
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_vote_scores.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [
        { total_score: "desc" as const },
        { last_updated_at: "desc" as const },
      ],
      ...CommunityPlatformPostVoteScoreAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_post_vote_scores.count({
      where: whereInput,
    }),
  ]);
  // 4. 转换数据和构建响应
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostVoteScoreAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
