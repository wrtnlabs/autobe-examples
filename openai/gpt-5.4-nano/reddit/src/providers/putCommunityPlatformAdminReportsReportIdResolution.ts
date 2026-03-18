import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportResolutionCollector } from "../collectors/CommunityPlatformReportResolutionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminReportsReportIdResolution(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportResolution.ICreate;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        community_id: true,
        reporter_id: true,
        target_type: true,
        target_id: true,
        reason: true,
        deleted_at: true,
      },
    });
  const reportTarget =
    await MyGlobal.prisma.community_platform_report_targets.findFirstOrThrow({
      where: { community_platform_report_id: props.reportId },
      select: {
        id: true,
        target_type: true,
        target_id: true,
      },
    });
  if (
    reportTarget.target_type !== report.target_type ||
    reportTarget.target_id !== report.target_id
  ) {
    throw new HttpException("Invalid report target mapping", 400);
  }
  const adminEntity =
    await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
      where: { id: props.admin.id, deleted_at: null },
      select: { id: true },
    });
  const nowIso = toISOStringSafe(new Date());
  const nowDateTime = nowIso satisfies string & tags.Format<"date-time">;
  const resolutionRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_report_resolutions.findUnique({
      where: { community_platform_report_id: report.id },
      select: { id: true },
    });
    const resolutionInput =
      await CommunityPlatformReportResolutionCollector.collect({
        body: props.body,
        report: { id: report.id } satisfies IEntity,
        moderatedBy: { id: adminEntity.id } satisfies IEntity,
      });
    if (existing) {
      return await tx.community_platform_report_resolutions.update({
        where: { community_platform_report_id: report.id },
        data: {
          resolution_decision: props.body.resolution_decision,
          moderation_note: props.body.moderation_note ?? "",
          resolved_at: nowDateTime,
          updated_at: nowDateTime,
        },
      });
    }
    return await tx.community_platform_report_resolutions.create({
      data: resolutionInput,
    });
  });
  await MyGlobal.prisma.community_platform_report_snapshots.create({
    data: {
      id: v4(),
      community_platform_report_id: report.id,
      community_platform_report_target_id: reportTarget.id,
      snapshot_reason: report.reason,
      snapshot_status: props.body.resolution_decision,
      community_platform_report_resolution_id: resolutionRecord.id,
      reviewed_by_admin_id: adminEntity.id,
      reviewed_by_member_id: null,
      captured_at: nowDateTime,
      created_at: nowDateTime,
      updated_at: nowDateTime,
      deleted_at: null,
    },
  });
  if (props.body.resolution_decision === "approved") {
    if (report.target_type === "post") {
      await MyGlobal.prisma.community_platform_posts.delete({
        where: { id: report.target_id },
      });
    } else if (report.target_type === "comment") {
      await MyGlobal.prisma.community_platform_comments.delete({
        where: { id: report.target_id },
      });
    } else {
      throw new HttpException("Unsupported report target type", 400);
    }
  }
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
