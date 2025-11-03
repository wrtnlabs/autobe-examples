import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminAbuseReportsAbuseReportId(props: {
  admin: AdminPayload;
  abuseReportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAbuseReport> {
  const report =
    await MyGlobal.prisma.discussion_board_abuse_reports.findUnique({
      where: { id: props.abuseReportId },
    });
  if (!report) {
    throw new HttpException("Abuse report not found", 404);
  }
  return {
    id: report.id,
    reporter_user_id: report.reporter_user_id,
    target_article_id:
      report.target_article_id === null ? undefined : report.target_article_id,
    target_comment_id:
      report.target_comment_id === null ? undefined : report.target_comment_id,
    abuse_category: report.abuse_category,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  };
}
