import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformFeedResult";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformResults(props: {
  body: IRedditPlatformFeedResult.IRequest;
}): Promise<IPageIRedditPlatformFeedResult.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions from request
  const whereConditions: Prisma.reddit_platform_feed_resultsWhereInput = {};
  if (props.body.communityId) {
    whereConditions.feed_preference_id = props.body.communityId;
  }
  // Sort configuration based on algorithm
  const orderByCondition: Prisma.reddit_platform_feed_resultsOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "hot":
          return { vote_score: "desc" };
        case "top":
          return { vote_score: "desc" };
        case "new":
          return { post_created_at: "desc" };
        case "controversial":
          return { comment_count: "desc" };
        default:
          return { vote_score: "desc" };
      }
    })();
  const feedResults =
    await MyGlobal.prisma.reddit_platform_feed_results.findMany({
      where: whereConditions,
      orderBy: orderByCondition,
      skip,
      take: limit,
    });
  const total = await MyGlobal.prisma.reddit_platform_feed_results.count({
    where: whereConditions,
  });
  const transformedData: IRedditPlatformFeedResult.ISummary[] = feedResults.map(
    (record: any) => ({
      id: record.id,
      postId: record.post_id,
      postTitle: record.post_title,
      postType: record.post_type,
      voteScore: record.vote_score,
      commentCount: record.comment_count,
      postCreatedAt: toISOStringSafe(record.post_created_at),
      authorUsername: record.author_username,
      communityName: record.community_name,
    }),
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
