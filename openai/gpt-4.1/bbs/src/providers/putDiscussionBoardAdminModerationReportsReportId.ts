import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminModerationReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  const existing = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: props.reportId, deleted_at: null },
  });
  if (!existing) {
    throw new HttpException("Report not found", 404);
  }

  // Only allow update to reason, description, status
  const updatable: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(props.body, "reason")) {
    updatable.reason = props.body.reason;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    updatable.description = props.body.description ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "status")) {
    // Validate status transition per business rules
    const current = existing.status;
    const next = props.body.status;
    // Example: Prevent resolved->open regression (adjust for actual rules)
    if (current === "resolved" && next === "open") {
      throw new HttpException(
        "Status regression from resolved to open is not allowed",
        400,
      );
    }
    updatable.status = next;
  }

  if (Object.keys(updatable).length === 0) {
    throw new HttpException(
      "No updates provided; at least one updatable field required.",
      400,
    );
  }

  updatable.updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: props.reportId },
    data: updatable,
  });

  return {
    id: updated.id,
    target_type: updated.target_type,
    target_id: updated.target_id,
    reason: updated.reason,
    description: updated.description ?? null,
    status: updated.status,
    reporter_user_id: updated.reporter_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
