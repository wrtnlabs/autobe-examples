import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string;
}): Promise<IDiscussionBoardModerationAction> {
  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
      where: { id: props.moderationActionId },
      include: {
        reportedContent: true,
        moderator: true,
      },
    });

  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  // Authorization check: Ensure the requesting moderator is the same who took the action
  if (moderationAction.discussion_board_moderator_id !== props.moderator.id) {
    throw new HttpException(
      "Forbidden: You are not authorized to access this moderation action",
      403,
    );
  }

  return moderationAction.id as IDiscussionBoardModerationAction;
}
