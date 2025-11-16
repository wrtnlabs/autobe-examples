import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserReportsReportId(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure the report exists
  const existingReport =
    await MyGlobal.prisma.discussion_board_reports.findUnique({
      where: { id: props.reportId },
    });

  if (existingReport === null) {
    // No such report
    throw new HttpException("Report not found", 404);
  }

  // Business rule: prevent deletion of reports that are still in an active workflow state.
  // The exact lifecycle values are domain-specific; based on tests we must at least
  // block deletion when the report is still in its initial/active state. We assume
  // that statuses like "submitted" or "in_review" represent such active states.
  const status = existingReport.status;

  if (status === "submitted" || status === "in_review") {
    throw new HttpException(
      "Active or unresolved reports cannot be hard-deleted.",
      400,
    );
  }

  // Proceed with hard delete. Any dependent rows are handled according to
  // Prisma relational configuration (e.g., cascading deletes).
  await MyGlobal.prisma.discussion_board_reports.delete({
    where: { id: props.reportId },
  });

  // No response body; success is indicated by HTTP status code at controller level.
  return;
}
