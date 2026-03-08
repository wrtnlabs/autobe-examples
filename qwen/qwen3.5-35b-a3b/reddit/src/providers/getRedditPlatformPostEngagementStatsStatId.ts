import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostEngagementStatTransformer } from "../transformers/RedditPlatformPostEngagementStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostEngagementStatsStatId(props: {
  statId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostEngagementStat> {
  const stat =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.findUniqueOrThrow(
      {
        where: {
          id: props.statId,
          deleted_at: null,
        },
        include: {
          post: {
            select: {
              deleted_at: true,
            },
          },
        } satisfies Prisma.reddit_platform_post_engagement_statsInclude,
      },
    );
  if (stat.post.deleted_at !== null) {
    throw new HttpException("Post engagement statistics not found", 404);
  }
  const transformed =
    await RedditPlatformPostEngagementStatTransformer.select();
  const fullStat =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.findUniqueOrThrow(
      {
        where: {
          id: props.statId,
          deleted_at: null,
        },
        ...transformed,
      },
    );
  return await RedditPlatformPostEngagementStatTransformer.transform(fullStat);
}
