import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorAccountActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAccountAction> {
  const action =
    await MyGlobal.prisma.discussion_board_account_actions.findUnique({
      where: { id: props.actionId },
    });

  if (action === null) {
    throw new HttpException("Account action not found", 404);
  }

  return {
    id: action.id as string & tags.Format<"uuid">,
    discussion_board_member_id: action.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_moderator_id:
      action.discussion_board_moderator_id as string & tags.Format<"uuid">,
    reversed_by_moderator_id:
      action.reversed_by_moderator_id === null
        ? null
        : (action.reversed_by_moderator_id as string & tags.Format<"uuid">),
    action_type: action.action_type as "suspension" | "ban",
    reason: action.reason,
    duration_days:
      action.duration_days === null
        ? null
        : (action.duration_days as 1 | 7 | 14 | 30),
    status: action.status as "active" | "expired" | "reversed",
    reversal_reason:
      action.reversal_reason === null ? null : action.reversal_reason,
    created_at: toISOStringSafe(action.created_at),
    expires_at:
      action.expires_at === null ? null : toISOStringSafe(action.expires_at),
    reversed_at:
      action.reversed_at === null ? null : toISOStringSafe(action.reversed_at),
  };
}
