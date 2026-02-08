import { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorUserUnbansUnbanId(props: {
  administrator: AdministratorPayload;
  unbanId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserUnban> {
  const record = await MyGlobal.prisma.discussion_board_user_unbans.findUnique({
    where: { id: props.unbanId },
    select: {
      id: true,
      user_ban_id: true,
      administrator_id: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!record) {
    throw new HttpException("User unban not found", 404);
  }
  return {
    id: record.id,
    discussion_board_user_ban: record.user_ban_id
      ? { id: record.user_ban_id }
      : undefined,
    discussion_board_administrator: record.administrator_id
      ? { id: record.administrator_id }
      : undefined,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
