import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getDiscussionBoardAdministratorReportsReportId(props: {
  administrator: AdministratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const { reportId } = props;

  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  return {
    id: report.id as string & tags.Format<"uuid">,
    reporter_member_id: report.reporter_member_id as string &
      tags.Format<"uuid">,
    reported_topic_id: report.reported_topic_id
      ? (report.reported_topic_id as string & tags.Format<"uuid">)
      : null,
    reported_reply_id: report.reported_reply_id
      ? (report.reported_reply_id as string & tags.Format<"uuid">)
      : null,
    assigned_moderator_id: report.assigned_moderator_id
      ? (report.assigned_moderator_id as string & tags.Format<"uuid">)
      : null,
    violation_category: report.violation_category,
    severity_level: report.severity_level,
    reporter_explanation: report.reporter_explanation ?? null,
    status: report.status,
    resolution_notes: report.resolution_notes ?? null,
    dismissal_reason: report.dismissal_reason ?? null,
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  };
}
