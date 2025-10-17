import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getDiscussionBoardAdministratorBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBan> {
  const { banId } = props;

  const ban = await MyGlobal.prisma.discussion_board_bans.findUniqueOrThrow({
    where: { id: banId },
  });

  return {
    id: ban.id as string & tags.Format<"uuid">,
    member_id: ban.member_id as string & tags.Format<"uuid">,
    administrator_id: ban.administrator_id as string & tags.Format<"uuid">,
    moderation_action_id: ban.moderation_action_id as string &
      tags.Format<"uuid">,
    ban_reason: ban.ban_reason,
    violation_summary: ban.violation_summary,
    is_appealable: ban.is_appealable,
    appeal_window_days: ban.appeal_window_days,
    ip_address_banned: ban.ip_address_banned,
    email_banned: ban.email_banned as string & tags.Format<"email">,
    is_reversed: ban.is_reversed,
    reversed_at: ban.reversed_at ? toISOStringSafe(ban.reversed_at) : null,
    reversal_reason: ban.reversal_reason,
    created_at: toISOStringSafe(ban.created_at),
    updated_at: toISOStringSafe(ban.updated_at),
  };
}
