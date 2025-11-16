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

export async function putDiscussionBoardUserModerationReportsReportId(props: {
  user: UserPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  // 1. Find the report by ID, ensure not soft-deleted
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new HttpException("Report not found or has been deleted", 404);
  }

  // 2. Check that the requester is the owner
  if (report.reporter_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: Only the owner may update this report",
      403,
    );
  }

  // 3. Enforce allowed status values
  const allowedStatuses = [
    "open",
    "in_review",
    "resolved",
    "rejected",
    "escalated",
  ];
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }

  // 4. Perform update for mutable fields only
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: {
      id: props.reportId,
    },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    target_type: updated.target_type,
    target_id: updated.target_id,
    reason: updated.reason,
    description: updated.description === undefined ? null : updated.description,
    status: updated.status,
    reporter_user_id: updated.reporter_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // deleted_at is optional nullable
    ...(typeof updated.deleted_at !== "undefined"
      ? {
          deleted_at:
            updated.deleted_at === null
              ? null
              : toISOStringSafe(updated.deleted_at),
        }
      : {}),
  };
}
