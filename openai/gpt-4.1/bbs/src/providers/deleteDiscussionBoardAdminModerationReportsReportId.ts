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

export async function deleteDiscussionBoardAdminModerationReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report || report.deleted_at !== null) {
    throw new HttpException("Report not found or already deleted", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: props.reportId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    target_type: updated.target_type,
    target_id: updated.target_id,
    reason: updated.reason,
    description:
      typeof updated.description === "string"
        ? updated.description
        : updated.description === null
          ? null
          : undefined,
    status: updated.status,
    reporter_user_id: updated.reporter_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
