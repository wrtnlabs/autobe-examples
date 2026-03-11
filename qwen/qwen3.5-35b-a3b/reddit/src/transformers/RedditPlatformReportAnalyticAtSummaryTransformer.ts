import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformReportAnalyticAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reported_content_type: true,
        reported_content_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: true,
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        resolvedBy: true,
        snapshots: true,
        viewHistories: true,
      },
      where: {
        deleted_at: null,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IRedditPlatformReportAnalytic.ISummary> {
    const reports = input;
    const totalReports = reports.length;
    const pendingReports = reports.filter((r) => r.status === "PENDING");
    const pendingReportsCount = pendingReports.length;
    const resolvedReports = reports.filter((r) => r.status === "RESOLVED");
    const dismissedReports = reports.filter((r) => r.status === "DISMISSED");
    const resolvedCount = resolvedReports.length;
    const dismissedCount = dismissedReports.length;
    const resolutionRate =
      resolvedCount + dismissedCount > 0
        ? Number(
            ((resolvedCount / (resolvedCount + dismissedCount)) * 100).toFixed(
              2,
            ),
          )
        : 0;
    let averageResolutionTimeMs = 0;
    if (resolvedReports.length > 0) {
      const totalTime = resolvedReports.reduce(
        (sum, r) => sum + (r.updated_at.getTime() - r.created_at.getTime()),
        0,
      );
      averageResolutionTimeMs = Number(
        (totalTime / resolvedReports.length).toFixed(2),
      );
    }
    const contentTypeMap = new Map<string, number>();
    reports.forEach((r) => {
      const type = r.reported_content_type;
      contentTypeMap.set(type, (contentTypeMap.get(type) || 0) + 1);
    });
    // Return single object (most common content type) instead of array
    const contentTypeDistribution = Array.from(contentTypeMap.entries()).sort(
      ([, countA], [, countB]) => countB - countA,
    )[0] || ["UNKNOWN", 0];
    const contentTypeDistributionValue: IRedditPlatformReportAnalytic.IContentTypeDistribution =
      {
        contentType: contentTypeDistribution[0] as "POST" | "COMMENT",
        count: contentTypeDistribution[1],
        percentage:
          totalReports > 0
            ? Number(
                ((contentTypeDistribution[1] / totalReports) * 100).toFixed(2),
              )
            : 0,
      };
    const communityMap = new Map<
      string,
      {
        count: number;
        pending: number;
        name: string;
      }
    >();
    reports.forEach((r) => {
      const commId = r.community.id;
      const commName = r.community.name;
      if (!communityMap.has(commId)) {
        communityMap.set(commId, { count: 0, pending: 0, name: commName });
      }
      const entry = communityMap.get(commId)!;
      entry.count += 1;
      if (r.status === "PENDING") {
        entry.pending += 1;
      }
    });
    const communityBreakdown: IRedditPlatformReportAnalytic.ICommunityBreakdown[] =
      Array.from(communityMap.entries()).map(
        ([communityId, { count, pending }]) => ({
          communityId,
          communityName: communityMap.get(communityId)!.name,
          reportCount: count,
          pendingCount: pending,
        }),
      );
    return {
      total_reports: totalReports,
      pending_reports: pendingReportsCount,
      resolution_rate: resolutionRate,
      average_resolution_time_ms: averageResolutionTimeMs,
      content_type_distribution: contentTypeDistributionValue,
      community_breakdown: communityBreakdown,
      flagged_communities: [],
    };
  }
}
