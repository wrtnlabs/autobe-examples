import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostEngagementStatsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostEngagementStat> {
  const engagementRecord =
    await MyGlobal.prisma.reddit_platform_post_engagement_stats.findUniqueOrThrow(
      {
        where: { id: props.id },
        select: {
          id: true,
          view_count: true,
          upvote_count: true,
          downvote_count: true,
          last_viewed_at: true,
        },
      },
    );
  const voteScore: number & tags.Type<"int32"> =
    engagementRecord.upvote_count - engagementRecord.downvote_count;
  return {
    id: engagementRecord.id,
    karma_score: voteScore,
  } satisfies IRedditPlatformPostEngagementStat;
}
