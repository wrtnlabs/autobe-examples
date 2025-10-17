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

export async function postDiscussionBoardAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardBan.ICreate;
}): Promise<IDiscussionBoardBan> {
  const { administrator, body } = props;

  const now = toISOStringSafe(new Date());
  const banId = v4() as string & tags.Format<"uuid">;

  const createdBan = await MyGlobal.prisma.discussion_board_bans.create({
    data: {
      id: banId,
      member_id: body.member_id,
      administrator_id: administrator.id,
      moderation_action_id: body.moderation_action_id,
      ban_reason: body.ban_reason,
      violation_summary: body.violation_summary,
      is_appealable: body.is_appealable,
      appeal_window_days: body.appeal_window_days ?? null,
      ip_address_banned: body.ip_address_banned ?? null,
      email_banned: body.email_banned,
      is_reversed: false,
      reversed_at: null,
      reversal_reason: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: createdBan.id as string & tags.Format<"uuid">,
    member_id: createdBan.member_id as string & tags.Format<"uuid">,
    administrator_id: createdBan.administrator_id as string &
      tags.Format<"uuid">,
    moderation_action_id: createdBan.moderation_action_id as string &
      tags.Format<"uuid">,
    ban_reason: createdBan.ban_reason,
    violation_summary: createdBan.violation_summary,
    is_appealable: createdBan.is_appealable,
    appeal_window_days: createdBan.appeal_window_days ?? null,
    ip_address_banned: createdBan.ip_address_banned ?? null,
    email_banned: createdBan.email_banned,
    is_reversed: createdBan.is_reversed,
    reversed_at: createdBan.reversed_at
      ? toISOStringSafe(createdBan.reversed_at)
      : null,
    reversal_reason: createdBan.reversal_reason ?? null,
    created_at: toISOStringSafe(createdBan.created_at),
    updated_at: toISOStringSafe(createdBan.updated_at),
  };
}
