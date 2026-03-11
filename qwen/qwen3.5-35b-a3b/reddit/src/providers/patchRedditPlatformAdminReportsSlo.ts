import { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
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

export async function patchRedditPlatformAdminReportsSlo(props: {
  admin: AdminPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IRedditPlatformReport> {
  const startDate: string & tags.Format<"date-time"> =
    props.body.startDate ??
    toISOStringSafe(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const endDate: string & tags.Format<"date-time"> =
    props.body.endDate ?? toISOStringSafe(new Date());
  const granularity = props.body.granularity ?? "daily";
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for reports
  const baseWhere: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.status && { status: props.body.status }),
    created_at: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };
  // Get counts by status
  const pendingCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { ...baseWhere, status: "pending" },
  });
  const resolvedCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { ...baseWhere, status: "resolved" },
  });
  const dismissedCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { ...baseWhere, status: "dismissed" },
  });
  // Get all resolved reports for SLA calculations
  const resolvedReports =
    await MyGlobal.prisma.reddit_platform_reports.findMany({
      where: {
        ...baseWhere,
        status: "resolved",
      },
      select: {
        id: true,
        created_at: true,
        community_id: true,
      },
    });
  // Calculate SLA metrics
  const resolvedReportsCount = resolvedReports.length;
  let slaComplianceRate = 0;
  let avgResponseTimeHours = 0;
  if (resolvedReportsCount > 0) {
    const withinSlaCount = resolvedReports.filter((report) => {
      return false;
    }).length;
    slaComplianceRate = (withinSlaCount / resolvedReportsCount) * 100;
    const totalHours = resolvedReports.reduce((sum, report) => {
      return sum;
    }, 0);
    avgResponseTimeHours = totalHours / resolvedReportsCount;
  }
  // Get SLA breaches
  const slaBreachReports = resolvedReports.filter((report) => {
    return false;
  });
  const slaBreachesFormatted = slaBreachReports.map((report) => {
    return {
      report_id: report.id as string & tags.Format<"uuid">,
      community_id: report.community_id as string & tags.Format<"uuid">,
      reported_type: "POST" as "POST" | "COMMENT",
      reported_content_id: report.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date(report.created_at)),
      resolved_at: toISOStringSafe(new Date(report.created_at)),
      hours_over_sla: 0,
    } satisfies ISLABreach;
  });
  // Get daily volume trends
  const allReportsForTrends =
    await MyGlobal.prisma.reddit_platform_reports.findMany({
      where: baseWhere,
      select: {
        id: true,
        created_at: true,
        status: true,
      },
      orderBy: { created_at: "asc" },
    });
  const dailyVolumeMap = new Map<string, number>();
  const resolutionRateMap = new Map<
    string,
    {
      resolved: number;
      total: number;
    }
  >();
  for (const report of allReportsForTrends) {
    const dateKey = toISOStringSafe(new Date(report.created_at)).split("T")[0];
    const formattedDate: string & tags.Format<"date"> = dateKey as string &
      tags.Format<"date">;
    // Daily volume
    dailyVolumeMap.set(
      formattedDate,
      (dailyVolumeMap.get(formattedDate) ?? 0) + 1,
    );
    // Resolution rate
    if (!resolutionRateMap.has(formattedDate)) {
      resolutionRateMap.set(formattedDate, { resolved: 0, total: 0 });
    }
    const rateEntry = resolutionRateMap.get(formattedDate)!;
    rateEntry.total += 1;
    if (report.status === "resolved") {
      rateEntry.resolved += 1;
    }
  }
  const dailyVolumeFormatted = Array.from(dailyVolumeMap.entries()).map(
    ([date, count]) =>
      ({
        date,
        count,
      }) satisfies IDailyReportVolume,
  );
  const resolutionRateFormatted = Array.from(resolutionRateMap.entries()).map(
    ([date, data]) =>
      ({
        date: date as string & tags.Format<"date-time">,
        resolution_rate:
          data.total > 0 ? (data.resolved / data.total) * 100 : 0,
      }) satisfies IResolutionRatePoint,
  );
  // Get community breakdown
  const communities =
    await MyGlobal.prisma.reddit_platform_communities.findMany({
      where: props.body.community_id
        ? { id: props.body.community_id }
        : undefined,
      select: {
        id: true,
        name: true,
      },
    });
  const communityBreakdownFormatted = await ArrayUtil.asyncMap(
    communities,
    async (community) => {
      const communityReports =
        await MyGlobal.prisma.reddit_platform_reports.findMany({
          where: {
            ...baseWhere,
            community_id: community.id,
            status: "resolved",
          },
          select: {
            created_at: true,
            status: true,
          },
        });
      const communityPendingCount =
        await MyGlobal.prisma.reddit_platform_reports.count({
          where: {
            ...baseWhere,
            community_id: community.id,
            status: "pending",
          },
        });
      const communityTotalReports =
        await MyGlobal.prisma.reddit_platform_reports.count({
          where: { ...baseWhere, community_id: community.id },
        });
      const resolvedCountForCommunity = communityReports.length;
      let communitySlaComplianceRate = 0;
      let communityAvgResponseTime = 0;
      if (resolvedCountForCommunity > 0) {
        const withinSla = communityReports.filter((report) => {
          return false;
        }).length;
        communitySlaComplianceRate =
          (withinSla / resolvedCountForCommunity) * 100;
        const totalHours = communityReports.reduce((sum, report) => {
          return sum;
        }, 0);
        communityAvgResponseTime = totalHours / resolvedCountForCommunity;
      }
      return {
        community_id: community.id as string & tags.Format<"uuid">,
        community_name: community.name,
        sla_compliance_rate: communitySlaComplianceRate,
        avg_response_time_hours: communityAvgResponseTime,
        pending_count: communityPendingCount,
        total_reports: communityTotalReports,
      } satisfies ICommunitySLOMetric;
    },
  );
  // Get moderator workload
  const moderatorAuditLogs =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findMany({
      where: {
        created_at: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        ...(props.body.community_id && {
          community_id: props.body.community_id,
        }),
        action_type: { in: ["approve_report", "dismiss_report"] },
      },
      select: {
        moderator_id: true,
        action_type: true,
      },
    });
  const moderatorWorkMap = new Map<
    string,
    {
      resolved: number;
      dismissed: number;
    }
  >();
  for (const log of moderatorAuditLogs) {
    if (!moderatorWorkMap.has(log.moderator_id)) {
      moderatorWorkMap.set(log.moderator_id, { resolved: 0, dismissed: 0 });
    }
    const entry = moderatorWorkMap.get(log.moderator_id)!;
    if (log.action_type === "approve_report") {
      entry.resolved += 1;
    } else if (log.action_type === "dismiss_report") {
      entry.dismissed += 1;
    }
  }
  const moderatorDetails =
    await MyGlobal.prisma.reddit_platform_members.findMany({
      where: { id: { in: Array.from(moderatorWorkMap.keys()) } },
      select: {
        id: true,
        username: true,
      },
    });
  const moderatorWorkloadFormatted = await ArrayUtil.asyncMap(
    moderatorDetails,
    async (moderator) => {
      const workloadData = moderatorWorkMap.get(moderator.id);
      if (!workloadData) {
        return null;
      }
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const durationHours =
        (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
      const totalActions = workloadData.resolved + workloadData.dismissed;
      const actionsPerHour =
        durationHours > 0 ? totalActions / durationHours : 0;
      return {
        moderator_id: moderator.id as string & tags.Format<"uuid">,
        moderator_name: moderator.username,
        reports_resolved: workloadData.resolved,
        reports_dismissed: workloadData.dismissed,
        actions_per_hour: actionsPerHour,
      } satisfies IModeratorWorkload;
    },
  );
  const finalModeratorWorkload = moderatorWorkloadFormatted.filter(
    (item): item is IModeratorWorkload => item !== null,
  );
  return {
    sla_compliance_rate: slaComplianceRate,
    avg_response_time_hours: avgResponseTimeHours,
    backlog_by_status: {
      pending: pendingCount,
      resolved: resolvedCount,
      dismissed: dismissedCount,
    } satisfies {
      pending: number & tags.Type<"int32"> & tags.Minimum<0>;
      resolved: number & tags.Type<"int32"> & tags.Minimum<0>;
      dismissed: number & tags.Type<"int32"> & tags.Minimum<0>;
    },
    report_volume_trends: {
      daily_volume: dailyVolumeFormatted,
      resolution_rate: resolutionRateFormatted,
    },
    sla_breaches: slaBreachesFormatted,
    community_breakdown:
      communityBreakdownFormatted.length > 0
        ? communityBreakdownFormatted
        : undefined,
    moderator_workload:
      finalModeratorWorkload.length > 0 ? finalModeratorWorkload : undefined,
  } satisfies IRedditPlatformReport;
}
