import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberKarmaAnalytics(props: {
  member: MemberPayload;
}): Promise<IRedditLikeMember.IAnalytic> {
  // Get all member karma scores for overall statistics
  const members = await MyGlobal.prisma.reddit_like_members.findMany({
    where: { deleted_at: null },
    select: { karma_score: true },
  });
  const karmaScores = members.map((m) => m.karma_score);
  const totalUsers = karmaScores.length;
  if (totalUsers === 0) {
    return {
      overall: {
        total_users: 0,
        average_karma: 0,
        median_karma: 0,
        std_deviation: 0,
        min_karma: 0,
        max_karma: 0,
      },
      distribution: {
        p10: 0,
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0,
      },
      by_community: [],
      trends: {
        daily_change: 0,
        weekly_change: 0,
        monthly_change: 0,
      },
    };
  }
  // Calculate overall statistics
  const sortedKarma = [...karmaScores].sort((a, b) => a - b);
  const averageKarma = karmaScores.reduce((a, b) => a + b, 0) / totalUsers;
  const medianKarma = sortedKarma[Math.floor(totalUsers / 2)];
  const minKarma = Math.min(...karmaScores);
  const maxKarma = Math.max(...karmaScores);
  const variance =
    karmaScores.reduce((a, b) => a + Math.pow(b - averageKarma, 2), 0) /
    totalUsers;
  const stdDeviation = Math.sqrt(variance);
  // Calculate percentiles
  const p10 = sortedKarma[Math.floor(totalUsers * 0.1)];
  const p25 = sortedKarma[Math.floor(totalUsers * 0.25)];
  const p50 = medianKarma;
  const p75 = sortedKarma[Math.floor(totalUsers * 0.75)];
  const p90 = sortedKarma[Math.floor(totalUsers * 0.9)];
  // Get karma by community using Prisma's typed API
  const communityStats = await MyGlobal.prisma.reddit_like_communities.findMany(
    {
      where: { deleted_at: null },
      select: {
        id: true,
        posts: {
          where: { deleted_at: null },
          select: {
            score: true,
          },
        },
      },
    },
  );
  const byCommunity = communityStats
    .filter((c) => c.posts.length > 0)
    .map((c) => ({
      community_id: c.id as string & tags.Format<"uuid">,
      average_karma:
        c.posts.reduce((sum, p) => sum + p.score, 0) / c.posts.length,
    }));
  // Calculate trends - get posts created in the last day, week, month
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Get total karma change (sum of votes) for each time period
  const todayKarmaRaw = await MyGlobal.prisma.reddit_like_post_votes.findMany({
    where: {
      created_at: { gte: yesterday },
    },
    select: { value: true },
  });
  const todayKarmaSum = todayKarmaRaw.reduce((sum, v) => sum + v.value, 0);
  const weeklyKarmaRaw = await MyGlobal.prisma.reddit_like_post_votes.findMany({
    where: {
      created_at: { gte: lastWeek },
    },
    select: { value: true },
  });
  const weeklyKarmaSum = weeklyKarmaRaw.reduce((sum, v) => sum + v.value, 0);
  const monthlyKarmaRaw = await MyGlobal.prisma.reddit_like_post_votes.findMany(
    {
      where: {
        created_at: { gte: lastMonth },
      },
      select: { value: true },
    },
  );
  const monthlyKarmaSum = monthlyKarmaRaw.reduce((sum, v) => sum + v.value, 0);
  return {
    overall: {
      total_users: totalUsers,
      average_karma: averageKarma,
      median_karma: medianKarma,
      std_deviation: stdDeviation,
      min_karma: minKarma,
      max_karma: maxKarma,
    },
    distribution: {
      p10,
      p25,
      p50,
      p75,
      p90,
    },
    by_community: byCommunity,
    trends: {
      daily_change: todayKarmaSum,
      weekly_change: weeklyKarmaSum,
      monthly_change: monthlyKarmaSum,
    },
  };
}
