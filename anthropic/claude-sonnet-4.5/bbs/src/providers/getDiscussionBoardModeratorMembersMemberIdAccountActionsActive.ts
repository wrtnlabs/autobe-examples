import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorMembersMemberIdAccountActionsActive(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAccountAction | null> {
  const action =
    await MyGlobal.prisma.discussion_board_account_actions.findFirst({
      where: {
        discussion_board_member_id: props.memberId,
        status: "active",
      },
    });

  if (action === null) {
    return null;
  }

  return {
    id: action.id,
    discussion_board_member_id: action.discussion_board_member_id,
    discussion_board_moderator_id: action.discussion_board_moderator_id,
    reversed_by_moderator_id: action.reversed_by_moderator_id,
    action_type: typia.assert<"suspension" | "ban">(action.action_type),
    reason: action.reason,
    duration_days: typia.assert<1 | 7 | 14 | 30 | null | undefined>(
      action.duration_days,
    ),
    status: typia.assert<"active" | "expired" | "reversed">(action.status),
    reversal_reason: action.reversal_reason,
    created_at: toISOStringSafe(action.created_at),
    expires_at: action.expires_at ? toISOStringSafe(action.expires_at) : null,
    reversed_at: action.reversed_at
      ? toISOStringSafe(action.reversed_at)
      : null,
  };
}
