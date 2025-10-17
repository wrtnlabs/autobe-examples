import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, reportId } = props;

  // Step 1: Fetch the report
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: reportId },
  });
  if (!report) {
    throw new HttpException("Report does not exist", 404);
  }
  // Only allow deletion for resolved, dismissed, error, invalid, or erroneous status
  const allowedStatuses = [
    "resolved",
    "dismissed",
    "error",
    "erroneous",
    "invalid",
  ];
  if (!allowedStatuses.includes(report.status)) {
    throw new HttpException(
      "Report is not eligible for deletion; must be resolved, dismissed, or invalid",
      400,
    );
  }

  // Atomic deletion of related workflows + report + audit log
  await MyGlobal.prisma.$transaction([
    // Delete moderation queue entries for this report
    MyGlobal.prisma.community_platform_moderation_queues.deleteMany({
      where: { report_id: reportId },
    }),
    // Delete moderation actions related to this report
    MyGlobal.prisma.community_platform_moderation_actions.deleteMany({
      where: { report_id: reportId },
    }),
    // Delete escalation logs related to this report
    MyGlobal.prisma.community_platform_escalation_logs.deleteMany({
      where: { report_id: reportId },
    }),
    // Delete the report itself
    MyGlobal.prisma.community_platform_reports.delete({
      where: { id: reportId },
    }),
    // Audit log
    MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "admin",
        actor_id: admin.id,
        action_type: "delete",
        target_table: "community_platform_reports",
        target_id: reportId,
        details: JSON.stringify({
          reason: "staff_report_deletion",
          pre_status: report.status,
        }),
        created_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
}
