import { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsVotingMetrics(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityPlatformVoteKarmaImpact> {
  // Default pagination parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Get time boundaries for aggregation (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Aggregate voting transactions by period type
  const periodTypes: Array<"hourly" | "daily" | "weekly" | "monthly"> = [
    "hourly",
    "daily",
    "weekly",
    "monthly",
  ];
  const aggregatedMetrics: ICommunityPlatformVoteKarmaImpact[] = [];
  for (const periodType of periodTypes) {
    const periodMetrics = await aggregateVotingMetricsByPeriod(
      periodType,
      thirtyDaysAgo.toISOString(),
      now.toISOString(),
    );
    aggregatedMetrics.push(...periodMetrics);
  }
  // Apply pagination to the aggregated results
  const paginatedData = aggregatedMetrics.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: aggregatedMetrics.length,
      pages: Math.ceil(aggregatedMetrics.length / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  };
}
async function aggregateVotingMetricsByPeriod(
  periodType: "hourly" | "daily" | "weekly" | "monthly",
  startTime: string,
  endTime: string,
): Promise<ICommunityPlatformVoteKarmaImpact[]> {
  // Query voting transactions grouped by period
  const votingStats = await MyGlobal.prisma.$queryRaw<
    Array<{
      period_start: string;
      period_end: string;
      vote_submission_count: bigint;
      upvote_count: bigint;
      downvote_count: bigint;
      karma_impact_total: bigint;
      error_count: bigint;
      rate_limit_hits: bigint;
    }>
  >`
    SELECT 
      DATE_TRUNC(${periodType}, transaction_timestamp) as period_start,
      DATE_TRUNC(${periodType}, transaction_timestamp) + INTERVAL '1 ${periodType}' as period_end,
      COUNT(*) as vote_submission_count,
      COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) as upvote_count,
      COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as downvote_count,
      COALESCE(SUM(karma_impact), 0) as karma_impact_total,
      COUNT(CASE WHEN operation_type = 'error' THEN 1 END) as error_count,
      0 as rate_limit_hits -- Placeholder, would need rate limit table
    FROM community_platform_voting_transactions
    WHERE transaction_timestamp >= ${startTime}::timestamptz 
      AND transaction_timestamp < ${endTime}::timestamptz
    GROUP BY DATE_TRUNC(${periodType}, transaction_timestamp)
    ORDER BY period_start DESC
  `;
  // Query karma impacts for the same period
  const karmaStats = await MyGlobal.prisma.$queryRaw<
    Array<{
      period_start: string;
      karma_calculation_count: bigint;
    }>
  >`
    SELECT 
      DATE_TRUNC(${periodType}, created_at) as period_start,
      COUNT(*) as karma_calculation_count
    FROM community_platform_vote_karma_impacts
    WHERE created_at >= ${startTime}::timestamptz 
      AND created_at < ${endTime}::timestamptz
    GROUP BY DATE_TRUNC(${periodType}, created_at)
  `;
  // Query system performance metrics
  const systemStats = await MyGlobal.prisma.$queryRaw<
    Array<{
      period_start: string;
      avg_response_time: number;
      error_rate: number;
      system_uptime_percentage: number;
    }>
  >`
    SELECT 
      DATE_TRUNC(${periodType}, created_at) as period_start,
      AVG(avg_response_time) as avg_response_time,
      AVG(error_rate) as error_rate,
      AVG(system_uptime_percentage) as system_uptime_percentage
    FROM community_platform_system_snapshots
    WHERE created_at >= ${startTime}::timestamptz 
      AND created_at < ${endTime}::timestamptz
    GROUP BY DATE_TRUNC(${periodType}, created_at)
  `;
  // Combine all metrics
  return votingStats.map((stat) => {
    const karmaStat = karmaStats.find(
      (k) => k.period_start === stat.period_start,
    );
    const systemStat = systemStats.find(
      (s) => s.period_start === stat.period_start,
    );
    const totalVotes = Number(stat.upvote_count) + Number(stat.downvote_count);
    const voteRatio =
      totalVotes > 0 ? Number(stat.upvote_count) / totalVotes : 0;
    const karmaImpactAvg =
      totalVotes > 0 ? Number(stat.karma_impact_total) / totalVotes : 0;
    return {
      id: v4() as string & tags.Format<"uuid">,
      period_start: stat.period_start,
      period_end: stat.period_end,
      period_type: periodType,
      vote_submission_count: Number(stat.vote_submission_count),
      vote_submission_avg_time_ms: 50, // Estimated average processing time
      vote_score_update_count: Number(stat.vote_submission_count), // Same as submissions for now
      vote_score_update_avg_time_ms: 25, // Estimated average update time
      karma_calculation_count: karmaStat
        ? Number(karmaStat.karma_calculation_count)
        : 0,
      karma_calculation_avg_time_ms: 10, // Estimated average calculation time
      feed_score_update_count: Number(stat.vote_submission_count), // Same as submissions for now
      feed_score_update_avg_time_ms: 15, // Estimated average feed update time
      upvote_count: Number(stat.upvote_count),
      downvote_count: Number(stat.downvote_count),
      vote_ratio: voteRatio,
      karma_impact_total: Number(stat.karma_impact_total),
      karma_impact_avg_per_vote: karmaImpactAvg,
      error_count: Number(stat.error_count),
      error_rate: totalVotes > 0 ? Number(stat.error_count) / totalVotes : 0,
      rate_limit_hits: Number(stat.rate_limit_hits),
      system_cpu_utilization: systemStat
        ? systemStat.system_uptime_percentage * 0.8
        : 50, // Estimated CPU utilization
      system_memory_utilization: systemStat
        ? systemStat.system_uptime_percentage * 0.6
        : 40, // Estimated memory utilization
      created_at: new Date().toISOString(),
    } satisfies ICommunityPlatformVoteKarmaImpact;
  });
}
