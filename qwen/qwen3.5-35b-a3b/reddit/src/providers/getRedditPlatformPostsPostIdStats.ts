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
import { RedditPlatformPostEngagementStatAtSummaryTransformer } from "../transformers/RedditPlatformPostEngagementStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostIdStats(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostEngagementStat.ISummary> {
  const engagementStats =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.findFirstOrThrow(
      {
        where: {
          post_id: props.postId,
          deleted_at: null,
        },
        ...RedditPlatformPostEngagementStatAtSummaryTransformer.select(),
      },
    );
  return await RedditPlatformPostEngagementStatAtSummaryTransformer.transform(
    engagementStats,
  );
}
