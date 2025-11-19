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

export async function putDiscussionBoardModeratorAccountActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAccountAction.IUpdate;
}): Promise<IDiscussionBoardAccountAction> {
  const existing =
    await MyGlobal.prisma.discussion_board_account_actions.findUnique({
      where: { id: props.actionId },
    });

  if (!existing) {
    throw new HttpException("Account action not found", 404);
  }

  const updated = await MyGlobal.prisma.discussion_board_account_actions.update(
    {
      where: { id: props.actionId },
      data: {
        ...(props.body.action_type !== undefined && {
          action_type: props.body.action_type,
        }),
        ...(props.body.reason !== undefined && {
          reason: props.body.reason,
        }),
        ...(props.body.duration_days !== undefined && {
          duration_days: props.body.duration_days,
          expires_at:
            props.body.duration_days !== null
              ? toISOStringSafe(
                  new Date(
                    new Date(existing.created_at).getTime() +
                      props.body.duration_days * 24 * 60 * 60 * 1000,
                  ),
                )
              : null,
        }),
        ...(props.body.status !== undefined && {
          status: props.body.status,
          ...(props.body.status === "reversed" && {
            reversed_by_moderator_id: props.moderator.id,
            reversed_at: toISOStringSafe(new Date()),
          }),
        }),
        ...(props.body.reversal_reason !== undefined && {
          reversal_reason: props.body.reversal_reason,
        }),
      },
    },
  );

  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    discussion_board_moderator_id: updated.discussion_board_moderator_id,
    reversed_by_moderator_id: updated.reversed_by_moderator_id ?? undefined,
    action_type: updated.action_type as "suspension" | "ban",
    reason: updated.reason,
    duration_days:
      updated.duration_days !== null
        ? typia.assert<1 | 7 | 14 | 30>(updated.duration_days)
        : undefined,
    status: updated.status as "active" | "expired" | "reversed",
    reversal_reason: updated.reversal_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    expires_at: updated.expires_at
      ? toISOStringSafe(updated.expires_at)
      : undefined,
    reversed_at: updated.reversed_at
      ? toISOStringSafe(updated.reversed_at)
      : undefined,
  };
}
