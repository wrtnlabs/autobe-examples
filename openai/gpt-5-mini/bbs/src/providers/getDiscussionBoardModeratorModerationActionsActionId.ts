import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderator, actionId } = props;

  // Verify requesting moderator exists and is active
  const requestingModerator =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: {
        id: true,
        deleted_at: true,
      },
    });

  if (!requestingModerator) throw new HttpException("Unauthorized", 401);
  if (requestingModerator.deleted_at) throw new HttpException("Forbidden", 403);

  // Fetch moderation action
  const action =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
      where: { id: actionId },
    });
  if (!action) throw new HttpException("Not Found", 404);

  // Fetch acting moderator summary
  const actingModeratorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: action.moderator_id },
      select: {
        id: true,
        username: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!actingModeratorRecord) throw new HttpException("Not Found", 404);

  const moderatorSummary: IDiscussionBoardModerator.ISummary = {
    id: actingModeratorRecord.id as string & tags.Format<"uuid">,
    username: actingModeratorRecord.username,
    display_name: actingModeratorRecord.display_name ?? null,
    created_at: toISOStringSafe(actingModeratorRecord.created_at),
    updated_at: toISOStringSafe(actingModeratorRecord.updated_at),
    deleted_at: actingModeratorRecord.deleted_at
      ? toISOStringSafe(actingModeratorRecord.deleted_at)
      : null,
  };

  // Optionally fetch report summary if present
  let reportSummary: IDiscussionBoardReport.ISummary | null = null;
  if (
    action.discussion_board_report_id !== null &&
    action.discussion_board_report_id !== undefined
  ) {
    const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
      where: { id: action.discussion_board_report_id },
    });

    if (report) {
      const excerpt = report.explanation
        ? report.explanation.slice(0, 500)
        : null;
      reportSummary = {
        id: report.id as string & tags.Format<"uuid">,
        reporterMemberId:
          report.reporter_member_id === null
            ? null
            : (report.reporter_member_id as string & tags.Format<"uuid">),
        reporter: undefined,
        reasonCategory:
          report.reason_category as IDiscussionBoardReportReasonCategory,
        targetType: report.target_type,
        targetId: report.target_id as string & tags.Format<"uuid">,
        status: report.status as IDiscussionBoardReportStatus,
        createdAt: toISOStringSafe(report.created_at),
        processedAt: report.processed_at
          ? toISOStringSafe(report.processed_at)
          : null,
        closedAt: report.closed_at ? toISOStringSafe(report.closed_at) : null,
        explanationExcerpt:
          excerpt === null ? null : (excerpt as string & tags.MaxLength<500>),
        reportCount: null,
        uniqueReporterCount: null,
      };
    } else {
      reportSummary = null;
    }
  }

  const result: IDiscussionBoardModerationAction = {
    id: action.id as string & tags.Format<"uuid">,
    actionType: action.action_type as
      | "hide"
      | "remove"
      | "warn"
      | "suspend"
      | "ban",
    actionReason: action.action_reason ?? null,
    actionDurationDays: action.action_duration_days ?? null,
    targetType: action.target_type ?? null,
    targetId:
      action.target_id === null
        ? null
        : (action.target_id as string & tags.Format<"uuid">),
    createdAt: toISOStringSafe(action.created_at),
    effectiveFrom: action.effective_from
      ? toISOStringSafe(action.effective_from)
      : null,
    effectiveUntil: action.effective_until
      ? toISOStringSafe(action.effective_until)
      : null,
    moderator: moderatorSummary,
    report: reportSummary,
  };

  return result;
}
