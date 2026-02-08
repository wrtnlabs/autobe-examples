import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
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

export async function getDiscussionBoardAdministratorUserBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBan> {
  const record = await MyGlobal.prisma.discussion_board_user_bans.findUnique({
    where: { id: props.banId },
  });
  if (!record) throw new HttpException("Ban not found", 404);
  return {
    id: record.id,
    registered_user_id: record.registered_user_id,
    administrator_id: record.administrator_id,
    reason: record.reason,
    banned_at: record.banned_at ? toISOStringSafe(record.banned_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
