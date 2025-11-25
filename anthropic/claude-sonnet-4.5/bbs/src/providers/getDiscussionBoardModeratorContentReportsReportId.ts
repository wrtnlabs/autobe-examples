import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorContentReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardContentReport> {
  const report =
    await MyGlobal.prisma.discussion_board_content_reports.findUnique({
      where: {
        id: props.reportId,
      },
    });

  if (!report) {
    throw new HttpException("Content report not found", 404);
  }

  return {
    id: report.id,
    discussion_board_article_id: report.discussion_board_article_id,
    discussion_board_member_id: report.discussion_board_member_id,
    resolved_by_moderator_id: report.resolved_by_moderator_id ?? undefined,
    report_category: report.report_category,
    report_details: report.report_details ?? undefined,
    status: typia.assert<
      "pending" | "reviewed_no_action" | "reviewed_edited" | "reviewed_removed"
    >(report.status),
    resolution_notes: report.resolution_notes ?? undefined,
    created_at: toISOStringSafe(report.created_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : undefined,
  };
}
