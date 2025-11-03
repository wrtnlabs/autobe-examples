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

export async function postDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderator, body } = props;

  // Verify moderator exists and is active
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at) {
    throw new HttpException(
      "Unauthorized: moderator not found or deleted",
      403,
    );
  }

  // Verify referenced report if provided
  let reportRecord = null;
  if (
    body.discussion_board_report_id !== undefined &&
    body.discussion_board_report_id !== null
  ) {
    reportRecord = await MyGlobal.prisma.discussion_board_reports.findUnique({
      where: { id: body.discussion_board_report_id },
    });
    if (!reportRecord) throw new HttpException("Report not found", 404);
  }

  // Validate target existence when provided
  if (
    body.target_type !== undefined &&
    body.target_type !== null &&
    body.target_id !== undefined &&
    body.target_id !== null
  ) {
    switch (body.target_type) {
      case "article": {
        const article =
          await MyGlobal.prisma.discussion_board_articles.findUnique({
            where: { id: body.target_id },
          });
        if (!article) throw new HttpException("Target article not found", 404);
        break;
      }
      case "comment": {
        const comment =
          await MyGlobal.prisma.discussion_board_comments.findUnique({
            where: { id: body.target_id },
          });
        if (!comment) throw new HttpException("Target comment not found", 404);
        break;
      }
      case "attachment": {
        const attachment =
          await MyGlobal.prisma.discussion_board_attachments.findUnique({
            where: { id: body.target_id },
          });
        if (!attachment)
          throw new HttpException("Target attachment not found", 404);
        break;
      }
      case "member": {
        const member = await MyGlobal.prisma.discussion_board_member.findUnique(
          { where: { id: body.target_id } },
        );
        if (!member) throw new HttpException("Target member not found", 404);
        break;
      }
      default: {
        throw new HttpException("Unsupported target type", 400);
      }
    }
  }

  // Prepare timestamps once for consistency
  const now = toISOStringSafe(new Date());
  const effectiveFrom = body.effective_from
    ? toISOStringSafe(body.effective_from)
    : now;
  const effectiveUntil = body.action_duration_days
    ? toISOStringSafe(
        new Date(
          Date.parse(effectiveFrom) +
            body.action_duration_days * 24 * 60 * 60 * 1000,
        ),
      )
    : null;

  // Persist moderation action and audit entry transactionally
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdAction = await tx.discussion_board_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: moderator.id,
        discussion_board_report_id: body.discussion_board_report_id ?? null,
        action_type: body.action_type,
        action_reason: body.action_reason ?? null,
        action_duration_days: body.action_duration_days ?? null,
        target_type: body.target_type ?? null,
        target_id: body.target_id ?? null,
        created_at: now,
        effective_from: effectiveFrom ?? null,
        effective_until: effectiveUntil ?? null,
      },
    });

    await tx.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: createdAction.id,
        report_id: body.discussion_board_report_id ?? null,
        actor_moderator_id: moderator.id,
        event_type: "moderation.action",
        event_payload: JSON.stringify({
          action_type: body.action_type,
          action_reason: body.action_reason ?? null,
          action_duration_days: body.action_duration_days ?? null,
          target_type: body.target_type ?? null,
          target_id: body.target_id ?? null,
        }),
        occurred_at: now,
      },
    });

    return createdAction;
  });

  // Build moderator summary (convert dates)
  const moderatorSummary: IDiscussionBoardModerator.ISummary = {
    id: moderatorRecord.id as string & tags.Format<"uuid">,
    username: moderatorRecord.username,
    display_name: moderatorRecord.display_name ?? null,
    created_at: toISOStringSafe(moderatorRecord.created_at),
    updated_at: toISOStringSafe(moderatorRecord.updated_at),
    deleted_at: moderatorRecord.deleted_at
      ? toISOStringSafe(moderatorRecord.deleted_at)
      : null,
  };

  // Build optional report summary
  const reportSummary: IDiscussionBoardReport.ISummary | undefined =
    reportRecord
      ? {
          id: reportRecord.id as string & tags.Format<"uuid">,
          reporterMemberId: reportRecord.reporter_member_id ?? null,
          reporter: undefined,
          reasonCategory:
            reportRecord.reason_category as IDiscussionBoardReportReasonCategory,
          targetType: reportRecord.target_type,
          targetId: reportRecord.target_id as string & tags.Format<"uuid">,
          status: reportRecord.status as IDiscussionBoardReportStatus,
          createdAt: toISOStringSafe(reportRecord.created_at),
          processedAt: reportRecord.processed_at
            ? toISOStringSafe(reportRecord.processed_at)
            : null,
          closedAt: reportRecord.closed_at
            ? toISOStringSafe(reportRecord.closed_at)
            : null,
          explanationExcerpt: reportRecord.explanation
            ? reportRecord.explanation.slice(0, 500)
            : null,
          reportCount: null,
          uniqueReporterCount: null,
        }
      : undefined;

  // Map DB record to API DTO return shape
  const response: IDiscussionBoardModerationAction = {
    id: created.id as string & tags.Format<"uuid">,
    actionType: created.action_type as
      | "hide"
      | "remove"
      | "warn"
      | "suspend"
      | "ban",
    actionReason: created.action_reason ?? null,
    actionDurationDays: created.action_duration_days ?? null,
    targetType: created.target_type ?? null,
    targetId: created.target_id ?? null,
    createdAt: toISOStringSafe(created.created_at),
    effectiveFrom: created.effective_from
      ? toISOStringSafe(created.effective_from)
      : null,
    effectiveUntil: created.effective_until
      ? toISOStringSafe(created.effective_until)
      : null,
    moderator: moderatorSummary,
    report: reportSummary ?? undefined,
  };

  return response;
}
