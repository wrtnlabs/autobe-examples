import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function putDiscussionBoardModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationAction.IUpdate;
}): Promise<IDiscussionBoardModerationAction> {
  // Verify the moderation action exists and belongs to the authenticated moderator
  const existingAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findFirst({
      where: {
        id: props.actionId,
        discussion_board_moderator_id: props.moderator.id,
        deleted_at: null,
      },
    });

  if (!existingAction) {
    throw new HttpException(
      "Moderation action not found or you don't have permission to update it",
      404,
    );
  }

  // Validate escalation_level if provided
  if (props.body.escalation_level !== undefined) {
    const validEscalationLevels = ["standard", "escalated", "critical"];
    if (!validEscalationLevels.includes(props.body.escalation_level)) {
      throw new HttpException(
        "Invalid escalation level. Must be one of: standard, escalated, critical",
        400,
      );
    }
  }

  // Prepare update data with only allowed fields
  const updateData: Prisma.discussion_board_moderation_actionsUpdateInput = {
    ...(props.body.action_details !== undefined && {
      action_details: props.body.action_details,
    }),
    ...(props.body.duration_days !== undefined && {
      duration_days: props.body.duration_days,
    }),
    ...(props.body.escalation_level !== undefined && {
      escalation_level: props.body.escalation_level,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Update the moderation action
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_actions.update({
      where: { id: props.actionId },
      data: updateData,
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    action_type: updated.action_type,
    action_details: updated.action_details ?? undefined,
    duration_days: updated.duration_days ?? undefined,
    escalation_level: updated.escalation_level,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    discussion_board_content_report_id:
      updated.discussion_board_content_report_id as string &
        tags.Format<"uuid">,
    discussion_board_moderator_id:
      updated.discussion_board_moderator_id as string & tags.Format<"uuid">,
    discussion_board_moderator_session_id:
      updated.discussion_board_moderator_session_id as string &
        tags.Format<"uuid">,
    contentReport: undefined,
    moderator: undefined,
    moderatorSession: undefined,
  };
}
