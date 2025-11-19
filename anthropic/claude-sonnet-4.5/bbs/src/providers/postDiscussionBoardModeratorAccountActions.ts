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

export async function postDiscussionBoardModeratorAccountActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardAccountAction.ICreate;
}): Promise<IDiscussionBoardAccountAction> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.body.discussion_board_member_id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const now = new Date();

  let expiresAtDate: Date | null = null;
  let durationDays: number | null = null;

  if (props.body.action_type === "suspension" && props.body.duration_days) {
    durationDays = props.body.duration_days;
    expiresAtDate = new Date(
      now.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );
  }

  const created = await MyGlobal.prisma.discussion_board_account_actions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: props.body.discussion_board_member_id,
        discussion_board_moderator_id: props.moderator.id,
        reversed_by_moderator_id: null,
        action_type: props.body.action_type,
        reason: props.body.reason,
        duration_days: durationDays,
        status: "active",
        reversal_reason: null,
        created_at: now,
        expires_at: expiresAtDate,
        reversed_at: null,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_member_id: created.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_moderator_id:
      created.discussion_board_moderator_id as string & tags.Format<"uuid">,
    reversed_by_moderator_id:
      created.reversed_by_moderator_id === null
        ? null
        : (created.reversed_by_moderator_id as string & tags.Format<"uuid">),
    action_type: created.action_type as "suspension" | "ban",
    reason: created.reason,
    duration_days:
      created.duration_days === null
        ? null
        : (created.duration_days as 1 | 7 | 14 | 30),
    status: created.status as "active" | "expired" | "reversed",
    reversal_reason: created.reversal_reason,
    created_at: toISOStringSafe(created.created_at),
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    reversed_at: created.reversed_at
      ? toISOStringSafe(created.reversed_at)
      : null,
  };
}
