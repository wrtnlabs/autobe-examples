import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserCommentsStatistics(props: {
  user: UserPayload;
}): Promise<IRedditPlatformComment.IStatistic> {
  // Query aggregated statistics from reddit_platform_comments
  const stats = await MyGlobal.prisma.reddit_platform_comments.aggregate({
    _count: {
      id: true,
    },
    _avg: {
      vote_score: true,
    },
    _sum: {
      vote_score: true,
    },
    _min: {
      vote_score: true,
    },
    _max: {
      vote_score: true,
    },
  });
  // Query temporal distribution patterns
  const dailyDistribution =
    await MyGlobal.prisma.reddit_platform_comments.groupBy({
      by: ["created_at"],
      _count: {
        created_at: true,
      },
    });
  // Return comprehensive statistics
  return {
    total_comments: stats._count.id,
    average_score: stats._avg.vote_score ?? 0,
    total_score: stats._sum.vote_score ?? 0,
    min_score: stats._min.vote_score ?? 0,
    max_score: stats._max.vote_score ?? 0,
    daily_distribution: dailyDistribution.map((d) => ({
      timestamp: d.created_at,
      comment_count: d._count.created_at,
    })),
  };
}
