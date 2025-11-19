import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardChannelStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannelStatistics";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { IPostTrendDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostTrendDirection";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorStatisticsPostsByChannel(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardChannelStatistics> {
  // Get channel statistics using Prisma aggregations
  const channelStats = await MyGlobal.prisma.discussion_board_posts.groupBy({
    by: ["discussion_board_channel_id"],
    where: {
      status: "published",
      deleted_at: null,
    },
    _count: {
      id: true,
    },
    _max: {
      created_at: true,
    },
  });

  // Get total post count for percentage calculation
  const totalPostsCount = await MyGlobal.prisma.discussion_board_posts.count({
    where: {
      status: "published",
      deleted_at: null,
    },
  });

  // Get channel information
  const channels = await MyGlobal.prisma.discussion_board_channels.findMany({
    where: {
      status: "active",
      deleted_at: null,
    },
  });

  // Find the channel with the most posts (primary channel for statistics)
  const primaryChannelStats = channelStats.reduce(
    (max, stats) => (stats._count.id > max._count.id ? stats : max),
    channelStats[0],
  );

  const primaryChannel = channels.find(
    (channel) => channel.id === primaryChannelStats.discussion_board_channel_id,
  );

  if (!primaryChannel) {
    throw new HttpException(
      "No active channels with published posts found",
      404,
    );
  }

  const totalPosts = primaryChannelStats._count.id;
  const percentageDistribution =
    totalPostsCount > 0 ? (totalPosts / totalPostsCount) * 100 : 0;

  // Calculate average posts per day based on channel creation date
  const channelCreationDate = new Date(primaryChannel.created_at);
  const lastActivityDate = primaryChannelStats._max.created_at
    ? new Date(primaryChannelStats._max.created_at)
    : channelCreationDate;

  const daysActive = Math.max(
    1,
    (lastActivityDate.getTime() - channelCreationDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const averagePostsPerDay = totalPosts / daysActive;

  // Simple trend direction based on recent activity
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentPostsCount = await MyGlobal.prisma.discussion_board_posts.count({
    where: {
      discussion_board_channel_id: primaryChannel.id,
      status: "published",
      deleted_at: null,
      created_at: {
        gte: oneWeekAgo,
      },
    },
  });

  const weeklyAverage = recentPostsCount / 7;
  let trendDirection: IPostTrendDirection = "stable";

  if (weeklyAverage > averagePostsPerDay * 1.2) {
    trendDirection = "increasing";
  } else if (weeklyAverage < averagePostsPerDay * 0.8) {
    trendDirection = "decreasing";
  }

  return {
    channel: {
      id: primaryChannel.id,
      name: primaryChannel.name,
      description: primaryChannel.description,
      status: primaryChannel.status,
      created_at: toISOStringSafe(primaryChannel.created_at),
    },
    total_posts: totalPosts,
    percentage_distribution: percentageDistribution,
    average_posts_per_day: averagePostsPerDay,
    last_activity_at: primaryChannelStats._max.created_at
      ? toISOStringSafe(primaryChannelStats._max.created_at)
      : toISOStringSafe(primaryChannel.created_at),
    trend_direction: trendDirection,
  };
}
