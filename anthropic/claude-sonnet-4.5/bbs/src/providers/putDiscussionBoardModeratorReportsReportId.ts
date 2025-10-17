import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  const { moderator, reportId, body } = props;

  const existingReport =
    await MyGlobal.prisma.discussion_board_reports.findUniqueOrThrow({
      where: { id: reportId },
    });

  const now = toISOStringSafe(new Date());

  const shouldSetResolvedAt =
    (body.status === "resolved" || body.status === "dismissed") &&
    existingReport.resolved_at === null;

  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: reportId },
    data: {
      ...(body.assigned_moderator_id !== undefined && {
        assigned_moderator_id: body.assigned_moderator_id,
      }),
      ...(body.status !== undefined && {
        status: body.status,
      }),
      ...(body.resolution_notes !== undefined && {
        resolution_notes: body.resolution_notes,
      }),
      ...(body.dismissal_reason !== undefined && {
        dismissal_reason: body.dismissal_reason,
      }),
      ...(shouldSetResolvedAt && {
        resolved_at: now,
      }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    reporter_member_id: updated.reporter_member_id,
    reported_topic_id:
      updated.reported_topic_id === null
        ? undefined
        : updated.reported_topic_id,
    reported_reply_id:
      updated.reported_reply_id === null
        ? undefined
        : updated.reported_reply_id,
    assigned_moderator_id:
      updated.assigned_moderator_id === null
        ? undefined
        : updated.assigned_moderator_id,
    violation_category: updated.violation_category,
    severity_level: updated.severity_level,
    reporter_explanation:
      updated.reporter_explanation === null
        ? undefined
        : updated.reporter_explanation,
    status: updated.status,
    resolution_notes:
      updated.resolution_notes === null ? undefined : updated.resolution_notes,
    dismissal_reason:
      updated.dismissal_reason === null ? undefined : updated.dismissal_reason,
    resolved_at:
      updated.resolved_at === null
        ? undefined
        : toISOStringSafe(updated.resolved_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
