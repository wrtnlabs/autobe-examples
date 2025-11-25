import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findFirst({
      where: {
        id: props.actionId,
        deleted_at: null,
      },
    });

  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Fetch related entities separately
  const contentReport = moderationAction.discussion_board_content_report_id
    ? await MyGlobal.prisma.discussion_board_content_reports.findFirst({
        where: {
          id: moderationAction.discussion_board_content_report_id,
          deleted_at: null,
        },
      })
    : null;

  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        id: moderationAction.discussion_board_moderator_id,
        deleted_at: null,
      },
    },
  );

  const moderatorSession =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: moderationAction.discussion_board_moderator_session_id,
        deleted_at: null,
      },
    });

  return {
    id: moderationAction.id as string & tags.Format<"uuid">,
    action_type: moderationAction.action_type,
    action_details: moderationAction.action_details ?? undefined,
    duration_days: moderationAction.duration_days ?? undefined,
    escalation_level: moderationAction.escalation_level,
    created_at: toISOStringSafe(moderationAction.created_at),
    updated_at: toISOStringSafe(moderationAction.updated_at),
    discussion_board_content_report_id:
      moderationAction.discussion_board_content_report_id as string &
        tags.Format<"uuid">,
    discussion_board_moderator_id:
      moderationAction.discussion_board_moderator_id as string &
        tags.Format<"uuid">,
    discussion_board_moderator_session_id:
      moderationAction.discussion_board_moderator_session_id as string &
        tags.Format<"uuid">,
    contentReport: contentReport
      ? {
          id: contentReport.id as string & tags.Format<"uuid">,
          actor: {
            id: contentReport.id as string & tags.Format<"uuid">,
            type: contentReport.actor_type,
            name:
              contentReport.actor_type === "member" ? "Member" : "Moderator",
          },
          content: {
            id: contentReport.id as string & tags.Format<"uuid">,
            type: "post",
            title: "Reported Content",
          },
          report_reason: contentReport.report_reason,
          status: contentReport.status,
          priority: contentReport.priority,
          report_details: contentReport.report_details ?? undefined,
          created_at: toISOStringSafe(contentReport.created_at),
          updated_at: toISOStringSafe(contentReport.updated_at),
        }
      : undefined,
    moderator: moderator
      ? {
          id: moderator.id as string & tags.Format<"uuid">,
          username: moderator.username,
          display_name: moderator.display_name ?? undefined,
          moderation_level: moderator.moderation_level,
          created_at: toISOStringSafe(moderator.created_at),
        }
      : undefined,
    moderatorSession: moderatorSession
      ? {
          id: moderatorSession.id as string & tags.Format<"uuid">,
          ip: moderatorSession.ip,
          href: moderatorSession.href,
          referrer: moderatorSession.referrer,
          created_at: toISOStringSafe(moderatorSession.created_at),
          updated_at: toISOStringSafe(moderatorSession.updated_at),
          expired_at: moderatorSession.expired_at
            ? toISOStringSafe(moderatorSession.expired_at)
            : undefined,
        }
      : undefined,
  };
}
