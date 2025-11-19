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

export async function deleteDiscussionBoardModeratorAccountActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAccountAction> {
  const existing =
    await MyGlobal.prisma.discussion_board_account_actions.findUnique({
      where: { id: props.actionId },
    });

  if (!existing) {
    throw new HttpException("Account action not found", 404);
  }

  const deleted = await MyGlobal.prisma.discussion_board_account_actions.delete(
    {
      where: { id: props.actionId },
    },
  );

  return {
    id: deleted.id,
    discussion_board_member_id: deleted.discussion_board_member_id,
    discussion_board_moderator_id: deleted.discussion_board_moderator_id,
    reversed_by_moderator_id: deleted.reversed_by_moderator_id ?? undefined,
    action_type: typia.assert<"suspension" | "ban">(deleted.action_type),
    reason: deleted.reason,
    duration_days:
      deleted.duration_days !== null && deleted.duration_days !== undefined
        ? typia.assert<1 | 7 | 14 | 30>(deleted.duration_days)
        : undefined,
    status: typia.assert<"active" | "expired" | "reversed">(deleted.status),
    reversal_reason: deleted.reversal_reason ?? undefined,
    created_at: toISOStringSafe(deleted.created_at),
    expires_at: deleted.expires_at
      ? toISOStringSafe(deleted.expires_at)
      : undefined,
    reversed_at: deleted.reversed_at
      ? toISOStringSafe(deleted.reversed_at)
      : undefined,
  };
}
