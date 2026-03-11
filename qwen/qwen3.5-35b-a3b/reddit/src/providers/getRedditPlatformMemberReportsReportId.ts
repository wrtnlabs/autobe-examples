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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  // Step 1: Fetch the report with all related data
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      include: {
        reporter: true,
        community: true,
        resolvedBy: true,
        viewHistories: true,
        snapshots: true,
      },
    });
  // Step 2: Verify the requesting member has moderator privileges for the community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.member.id,
      },
    });
  if (moderator === null) {
    throw new HttpException(
      "You do not have moderator privileges for this community",
      403,
    );
  }
  // Step 3: Create a report view record to track when the moderator viewed this report
  await MyGlobal.prisma.reddit_platform_report_views.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      report_id: props.reportId,
      moderator_id: props.member.id,
      viewed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 4: Query report metrics for the community
  const pendingCount: number & tags.Type<"int32"> & tags.Minimum<0> =
    await MyGlobal.prisma.reddit_platform_reports.count({
      where: {
        community_id: report.community_id,
        status: "PENDING",
        deleted_at: null,
      },
    });
  const resolvedCount: number & tags.Type<"int32"> & tags.Minimum<0> =
    await MyGlobal.prisma.reddit_platform_reports.count({
      where: {
        community_id: report.community_id,
        status: "RESOLVED",
        deleted_at: null,
      },
    });
  const dismissedCount: number & tags.Type<"int32"> & tags.Minimum<0> =
    await MyGlobal.prisma.reddit_platform_reports.count({
      where: {
        community_id: report.community_id,
        status: "DISMISSED",
        deleted_at: null,
      },
    });
  // Step 5: Calculate SLA compliance rate (reports resolved within 24 hours)
  const resolvedReports =
    await MyGlobal.prisma.reddit_platform_reports.findMany({
      where: {
        community_id: report.community_id,
        status: "RESOLVED",
        deleted_at: null,
      },
      select: {
        created_at: true,
        updated_at: true,
      },
    });
  let onTimeResolutions: number = 0;
  for (const r of resolvedReports) {
    if (r.updated_at !== null) {
      const hoursDiff =
        (r.updated_at.getTime() - r.created_at.getTime()) / (1000 * 60 * 60);
      if (hoursDiff <= 24) {
        onTimeResolutions++;
      }
    }
  }
  const slaComplianceRate: number & tags.Minimum<0> & tags.Maximum<100> =
    resolvedReports.length > 0
      ? (onTimeResolutions / resolvedReports.length) * 100
      : 0;
  const avgResponseTimeHours: number =
    resolvedReports.length > 0
      ? resolvedReports.reduce((acc, r) => {
          if (r.updated_at !== null) {
            const hoursDiff =
              (r.updated_at.getTime() - r.created_at.getTime()) /
              (1000 * 60 * 60);
            return acc + hoursDiff;
          }
          return acc;
        }, 0) / resolvedReports.length
      : 0;
  // Step 6: Query SLA breaches (reports exceeding 24 hours)
  const breachReports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      community_id: report.community_id,
      status: { in: ["RESOLVED", "DISMISSED"] },
      deleted_at: null,
    },
    select: {
      id: true,
      reporter_id: true,
      community_id: true,
      resolved_by_id: true,
      reported_content_type: true,
      reported_content_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          username: true,
          display_name: true,
        },
      },
      snapshots: true,
      viewHistories: true,
    },
  });
  const slaBreaches: ISLABreach[] = breachReports.map((reportItem) => {
    const isFinalStatus =
      reportItem.status === "RESOLVED" || reportItem.status === "DISMISSED";
    const resolvedAt: (string & tags.Format<"date-time">) | null =
      isFinalStatus && reportItem.updated_at !== null
        ? toISOStringSafe(reportItem.updated_at)
        : null;
    const hoursOverSla: number =
      isFinalStatus && reportItem.updated_at !== null
        ? Math.max(
            0,
            (reportItem.updated_at.getTime() -
              reportItem.created_at.getTime()) /
              (1000 * 60 * 60) -
              24,
          )
        : 0;
    return {
      report_id: reportItem.id as string & tags.Format<"uuid">,
      community_id: reportItem.community.id as string & tags.Format<"uuid">,
      reported_type: reportItem.reported_content_type as "POST" | "COMMENT",
      reported_content_id: reportItem.reported_content_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(reportItem.created_at) as string &
        tags.Format<"date-time">,
      resolved_at: resolvedAt,
      hours_over_sla: hoursOverSla,
    };
  });
  // Step 7: Build daily volume and resolution rate trends
  const allReports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      community_id: report.community_id,
      deleted_at: null,
    },
    select: {
      status: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: "asc" },
  });
  const dailyVolumeMap = new Map<string, number>();
  const resolutionMap = new Map<
    string,
    {
      resolved: number;
      total: number;
    }
  >();
  for (const r of allReports) {
    const date = r.created_at.toISOString().split("T")[0];
    dailyVolumeMap.set(date, (dailyVolumeMap.get(date) ?? 0) + 1);
    if (!resolutionMap.has(date)) {
      resolutionMap.set(date, { resolved: 0, total: 0 });
    }
    const entry = resolutionMap.get(date)!;
    entry.total++;
    if (r.status === "RESOLVED") {
      entry.resolved++;
    }
  }
  const dailyVolume: IDailyReportVolume[] = Array.from(
    dailyVolumeMap.entries(),
  ).map(([date, count]) => ({
    date: date as string & tags.Format<"date">,
    count: count as number & tags.Type<"int32"> & tags.Minimum<0>,
  }));
  const resolutionRate: IResolutionRatePoint[] = Array.from(
    resolutionMap.entries(),
  ).map(([date, data]) => {
    const rate = data.total > 0 ? (data.resolved / data.total) * 100 : 0;
    return {
      date: (date + "T00:00:00Z") as string & tags.Format<"date-time">,
      resolution_rate: rate as number & tags.Minimum<0> & tags.Maximum<100>,
    };
  });
  // Step 8: Return the complete SLO report
  return {
    sla_compliance_rate: slaComplianceRate,
    avg_response_time_hours: avgResponseTimeHours,
    backlog_by_status: {
      pending: pendingCount,
      resolved: resolvedCount,
      dismissed: dismissedCount,
    },
    report_volume_trends: {
      daily_volume: dailyVolume,
      resolution_rate: resolutionRate,
    },
    sla_breaches: slaBreaches,
    community_breakdown: undefined,
    moderator_workload: undefined,
  };
}
