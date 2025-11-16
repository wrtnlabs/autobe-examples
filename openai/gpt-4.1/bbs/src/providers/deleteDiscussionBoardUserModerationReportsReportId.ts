import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserModerationReportsReportId(props: {
  user: UserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  // Find existing report, must not be already soft-deleted
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: props.reportId },
  });

  if (!report || report.deleted_at !== null) {
    throw new HttpException(
      "Moderation report not found or already deleted.",
      404,
    );
  }

  // Only reporter can delete (admin path not handled in this endpoint)
  if (report.reporter_user_id !== props.user.id) {
    throw new HttpException(
      "You are not permitted to delete this report.",
      403,
    );
  }

  // Set deleted_at & updated_at to now (ISO string, no native Date usage)
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
    status: updated.status,
    reporter_user_id: updated.reporter_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    description: updated.description ?? undefined,
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
