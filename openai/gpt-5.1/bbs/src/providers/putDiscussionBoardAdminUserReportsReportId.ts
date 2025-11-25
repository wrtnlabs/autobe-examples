import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserReportsReportId(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  // 1. Load existing report by id
  const existing = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: props.reportId },
  });

  if (existing === null) {
    throw new HttpException("Report not found", 404);
  }

  // 2. Enforce basic workflow transition rules
  const currentStatus = existing.status;
  const requestedStatus = props.body.status;

  if (requestedStatus !== undefined) {
    // Terminal states that cannot move back to an initial-like state
    const terminalStatuses = ["resolved"];
    const initialLikeStatuses = ["submitted"];

    const isCurrentlyTerminal = terminalStatuses.indexOf(currentStatus) !== -1;
    const isRequestedInitialLike =
      initialLikeStatuses.indexOf(requestedStatus) !== -1;

    if (isCurrentlyTerminal && isRequestedInitialLike) {
      throw new HttpException(
        "Cannot transition a resolved report back to an initial submitted state",
        400,
      );
    }
  }

  // 3. Determine if there is any mutable field to update
  const hasStatusUpdate = props.body.status !== undefined;
  const hasActionUpdate = props.body.action !== undefined;

  // If nothing to update, simply return current state as DTO snapshot
  if (!hasStatusUpdate && !hasActionUpdate) {
    return {
      id: existing.id,
      target_type: existing.target_type,
      reporter_type: existing.reporter_type,
      reason_code: existing.reason_code,
      description: existing.description,
      status: existing.status,
      action: existing.action,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  }

  // 4. Persist update with only provided mutable fields
  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: props.reportId },
    data: {
      ...(hasStatusUpdate ? { status: props.body.status } : {}),
      ...(hasActionUpdate ? { action: props.body.action } : {}),
    },
  });

  // 5. Map updated record back to DTO
  return {
    id: updated.id,
    target_type: updated.target_type,
    reporter_type: updated.reporter_type,
    reason_code: updated.reason_code,
    description: updated.description,
    status: updated.status,
    action: updated.action,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
