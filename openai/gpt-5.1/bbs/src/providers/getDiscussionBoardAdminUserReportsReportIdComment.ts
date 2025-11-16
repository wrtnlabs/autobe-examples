import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfComment";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserReportsReportIdComment(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReportOfComment> {
  // 1. Load the base report by id
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: {
      id: props.reportId,
    },
  });

  if (report === null) {
    throw new HttpException("Report not found", 404);
  }

  // 2. Ensure this report targets a comment
  if (report.target_type !== "comment") {
    throw new HttpException("Report is not a comment report", 404);
  }

  // 3. Load the comment link row (1:1 by discussion_board_report_id)
  const commentLink =
    await MyGlobal.prisma.discussion_board_report_of_comments.findFirst({
      where: {
        discussion_board_report_id: report.id,
      },
    });

  if (commentLink === null) {
    throw new HttpException("Comment link for report not found", 404);
  }

  // 4. Map database records to DTO
  const dto: IDiscussionBoardReportOfComment = {
    id: report.id,
    target_type: report.target_type,
    reporter_type: report.reporter_type,
    reason_code: report.reason_code,
    description: report.description,
    status: report.status,
    action: report.action,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    discussion_board_comment_id: commentLink.discussion_board_comment_id,
    comment_link_created_at: toISOStringSafe(commentLink.created_at),
  };

  return dto;
}
