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

export async function getDiscussionBoardAdminModerationReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const report = await MyGlobal.prisma.discussion_board_reports.findFirst({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new HttpException("Moderation report not found", 404);
  }
  return {
    id: report.id,
    target_type: report.target_type,
    target_id: report.target_id,
    reason: report.reason,
    description: report.description === null ? undefined : report.description,
    status: report.status,
    reporter_user_id: report.reporter_user_id,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at:
      report.deleted_at === null
        ? undefined
        : toISOStringSafe(report.deleted_at),
  };
}
