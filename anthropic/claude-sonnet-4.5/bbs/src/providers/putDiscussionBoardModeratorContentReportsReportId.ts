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

export async function putDiscussionBoardModeratorContentReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentReport.IUpdate;
}): Promise<IDiscussionBoardContentReport> {
  const existing =
    await MyGlobal.prisma.discussion_board_content_reports.findUnique({
      where: { id: props.reportId },
    });

  if (existing === null) {
    throw new HttpException("Content report not found", 404);
  }

  const updated = await MyGlobal.prisma.discussion_board_content_reports.update(
    {
      where: { id: props.reportId },
      data: {
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.resolution_notes !== undefined && {
          resolution_notes: props.body.resolution_notes,
        }),
        resolved_by_moderator_id: props.moderator.id,
        resolved_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    discussion_board_article_id: updated.discussion_board_article_id as string &
      tags.Format<"uuid">,
    discussion_board_member_id: updated.discussion_board_member_id as string &
      tags.Format<"uuid">,
    resolved_by_moderator_id:
      updated.resolved_by_moderator_id === null
        ? null
        : (updated.resolved_by_moderator_id as string & tags.Format<"uuid">),
    report_category: updated.report_category,
    report_details:
      updated.report_details === null ? null : updated.report_details,
    status: updated.status as
      | "pending"
      | "reviewed_no_action"
      | "reviewed_edited"
      | "reviewed_removed",
    resolution_notes:
      updated.resolution_notes === null ? null : updated.resolution_notes,
    created_at: toISOStringSafe(updated.created_at),
    resolved_at:
      updated.resolved_at === null
        ? null
        : toISOStringSafe(updated.resolved_at),
  };
}
