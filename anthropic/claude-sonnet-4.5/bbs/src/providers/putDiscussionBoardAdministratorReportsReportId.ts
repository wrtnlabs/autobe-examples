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

export async function putDiscussionBoardAdministratorReportsReportId(props: {
  administrator: AdministratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  const { reportId, body } = props;

  const existingReport =
    await MyGlobal.prisma.discussion_board_reports.findUniqueOrThrow({
      where: { id: reportId },
    });

  const shouldSetResolvedAt =
    body.status !== undefined &&
    (body.status === "resolved" || body.status === "dismissed") &&
    existingReport.status !== "resolved" &&
    existingReport.status !== "dismissed";

  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: reportId },
    data: {
      assigned_moderator_id: body.assigned_moderator_id ?? undefined,
      status: body.status === null ? undefined : (body.status ?? undefined),
      resolution_notes: body.resolution_notes ?? undefined,
      dismissal_reason: body.dismissal_reason ?? undefined,
      resolved_at: shouldSetResolvedAt ? new Date() : undefined,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    reporter_member_id: updated.reporter_member_id,
    reported_topic_id: updated.reported_topic_id ?? undefined,
    reported_reply_id: updated.reported_reply_id ?? undefined,
    assigned_moderator_id: updated.assigned_moderator_id ?? undefined,
    violation_category: updated.violation_category,
    severity_level: updated.severity_level,
    reporter_explanation: updated.reporter_explanation ?? undefined,
    status: updated.status,
    resolution_notes: updated.resolution_notes ?? undefined,
    dismissal_reason: updated.dismissal_reason ?? undefined,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
