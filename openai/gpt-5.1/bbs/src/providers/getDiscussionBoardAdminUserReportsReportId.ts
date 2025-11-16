import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserReportsReportId(props: {
  adminUser: AdminuserPayload;
  reportId: string;
}): Promise<IDiscussionBoardReport> {
  // Read-only operation: fetch a single report by its primary key for admin review.
  // Authorization is already handled by AdminuserAuth decorator and adminuserAuthorize provider.

  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: {
      id: props.reportId,
    },
  });

  if (report === null) {
    throw new HttpException("Report not found", 404);
  }

  const createdAtString = toISOStringSafe(report.created_at);
  const updatedAtString = toISOStringSafe(report.updated_at);

  const output: IDiscussionBoardReport = {
    id: report.id,
    target_type: report.target_type,
    reporter_type: report.reporter_type,
    reason_code: report.reason_code,
    description: report.description,
    status: report.status,
    action: report.action,
    created_at: createdAtString,
    updated_at: updatedAtString,
  };

  return output;
}
