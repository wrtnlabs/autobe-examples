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

export async function patchRedditPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReport.IResolveRequest;
}): Promise<IRedditPlatformReport> {
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
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
      },
    });
  if (report.status !== "PENDING") {
    throw new HttpException("Report already resolved or dismissed", 409);
  }
  if (
    report.reported_content_type !== "POST" &&
    report.reported_content_type !== "COMMENT"
  ) {
    throw new HttpException("Invalid reported content type", 400);
  }
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.admin.id,
      },
    });
  if (!moderator) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  const actionType =
    props.body.action === "approve" ? "approve_report" : "dismiss_report";
  const updated_at = new Date().toISOString();
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.action === "approve" ? "RESOLVED" : "DISMISSED",
      resolved_by_id: props.admin.id,
      updated_at: updated_at,
    },
  });
  await MyGlobal.prisma.reddit_platform_moderation_audit_logs.create({
    data: {
      id: v4(),
      moderator_id: props.admin.id,
      community_id: report.community_id,
      action_type: actionType,
      action_target_type: report.reported_content_type,
      action_target_id: report.reported_content_id,
      action_reason:
        props.body.action === "approve"
          ? "Report approved"
          : "Report dismissed",
      action_details: JSON.stringify({ report_id: report.id }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  });
  if (props.body.action === "approve") {
    if (report.reported_content_type === "POST") {
      await MyGlobal.prisma.reddit_platform_posts.update({
        where: { id: report.reported_content_id },
        data: { deleted_at: new Date().toISOString() },
      });
    } else if (report.reported_content_type === "COMMENT") {
      await MyGlobal.prisma.reddit_platform_comments.update({
        where: { id: report.reported_content_id },
        data: { deleted_at: new Date().toISOString() },
      });
    }
  }
  const [pendingCount, resolvedCount, dismissedCount] = await Promise.all([
    MyGlobal.prisma.reddit_platform_reports.count({
      where: { status: "PENDING", deleted_at: null },
    }),
    MyGlobal.prisma.reddit_platform_reports.count({
      where: { status: "RESOLVED", deleted_at: null },
    }),
    MyGlobal.prisma.reddit_platform_reports.count({
      where: { status: "DISMISSED", deleted_at: null },
    }),
  ]);
  const totalResolved = resolvedCount;
  const slaBreachCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      status: "RESOLVED",
      deleted_at: null,
      created_at: {
        lt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });
  const slaComplianceRate =
    totalResolved > 0
      ? Math.round(((totalResolved - slaBreachCount) / totalResolved) * 10000) /
        100
      : 0;
  const reportsForAvg = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      status: "RESOLVED",
      deleted_at: null,
    },
    select: { created_at: true, updated_at: true },
  });
  const avgResponseTimeHours =
    reportsForAvg.length > 0
      ? reportsForAvg.reduce((sum, r) => {
          const diff =
            new Date(r.updated_at!).getTime() -
            new Date(r.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0) / reportsForAvg.length
      : 0;
  return {
    sla_compliance_rate: Math.max(
      0,
      Math.min(100, slaComplianceRate),
    ) satisfies number & tags.Minimum<0> & tags.Maximum<100>,
    avg_response_time_hours: avgResponseTimeHours satisfies number,
    backlog_by_status: {
      pending: pendingCount satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      resolved: resolvedCount satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      dismissed: dismissedCount satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies {
      pending: number & tags.Type<"int32"> & tags.Minimum<0>;
      resolved: number & tags.Type<"int32"> & tags.Minimum<0>;
      dismissed: number & tags.Type<"int32"> & tags.Minimum<0>;
    },
    report_volume_trends: {
      daily_volume: [] satisfies IDailyReportVolume[],
      resolution_rate: [] satisfies IResolutionRatePoint[],
    } satisfies {
      daily_volume: IDailyReportVolume[];
      resolution_rate: IResolutionRatePoint[];
    },
    sla_breaches: [] satisfies ISLABreach[],
  } satisfies IRedditPlatformReport;
}
