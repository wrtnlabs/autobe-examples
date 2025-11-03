import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminAbuseReportsAbuseReportId(props: {
  admin: AdminPayload;
  abuseReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the abuse report
  const report =
    await MyGlobal.prisma.discussion_board_abuse_reports.findUnique({
      where: { id: props.abuseReportId },
    });
  if (!report) {
    throw new HttpException("Abuse report not found", 404);
  }

  // Step 2: Validate status is terminal ('closed' or 'rejected')
  if (report.status !== "closed" && report.status !== "rejected") {
    throw new HttpException(
      "Abuse report can only be deleted after it is closed or rejected",
      409,
    );
  }

  // Step 3: Ensure no moderation actions reference this abuse report
  const relatedModerations =
    await MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where: { abuse_report_id: props.abuseReportId },
      select: { id: true },
    });
  if (relatedModerations.length > 0) {
    throw new HttpException(
      "Cannot delete abuse report: related moderation actions exist",
      409,
    );
  }

  // Step 4: Hard delete the abuse report
  await MyGlobal.prisma.discussion_board_abuse_reports.delete({
    where: { id: props.abuseReportId },
  });

  // Step 5: Record in audit log
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_admin_id: props.admin.id,
      target_article_id: report.target_article_id ?? null,
      target_comment_id: report.target_comment_id ?? null,
      moderation_action_id: v4() as string & tags.Format<"uuid">, // Must provide a value, generate dummy UUID
      audit_event_type: "abuse_report_deleted",
      audit_details: `Abuse report ${props.abuseReportId} permanently erased by admin ${props.admin.id}.`,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
