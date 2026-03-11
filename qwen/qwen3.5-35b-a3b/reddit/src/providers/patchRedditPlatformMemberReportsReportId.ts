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

export async function patchRedditPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReport.IModerate;
}): Promise<IRedditPlatformReport> {
  // Step 1: Get report to find community_id and validate state
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
        status: "pending",
      },
    });
  // Step 2: Verify moderator authorization for the community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.member.id,
      },
    });
  if (!moderator) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Step 3: Determine new status based on action
  const newStatus: "resolved" | "dismissed" =
    props.body.action === "approve" ? "resolved" : "dismissed";
  // Step 4: Update report with moderation decision
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: newStatus,
      resolved_by_id: props.member.id,
      updated_at: new Date(),
    },
  });
  // Step 5: If approve, soft delete reported content
  if (props.body.action === "approve") {
    if (report.reported_content_type === "POST") {
      await MyGlobal.prisma.reddit_platform_posts.update({
        where: { id: report.reported_content_id },
        data: { deleted_at: new Date() },
      });
    } else if (report.reported_content_type === "COMMENT") {
      await MyGlobal.prisma.reddit_platform_comments.update({
        where: { id: report.reported_content_id },
        data: { deleted_at: new Date() },
      });
    }
  }
  // Step 6: Calculate updated SLO metrics
  const totalReports = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { deleted_at: null, community_id: report.community_id },
  });
  const resolvedCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      deleted_at: null,
      community_id: report.community_id,
      status: "resolved",
    },
  });
  const dismissedCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      deleted_at: null,
      community_id: report.community_id,
      status: "dismissed",
    },
  });
  const pendingCount = totalReports - resolvedCount - dismissedCount;
  const slaComplianceRate =
    totalReports > 0 ? (resolvedCount / totalReports) * 100 : 0;
  return {
    sla_compliance_rate: typia.assert<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(slaComplianceRate),
    avg_response_time_hours: 0 satisfies number,
    backlog_by_status: {
      pending: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        pendingCount,
      ),
      resolved: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        resolvedCount,
      ),
      dismissed: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        dismissedCount,
      ),
    },
    report_volume_trends: {
      daily_volume: [],
      resolution_rate: [],
    },
    sla_breaches: [],
    community_breakdown: undefined,
    moderator_workload: undefined,
  } satisfies IRedditPlatformReport;
}
