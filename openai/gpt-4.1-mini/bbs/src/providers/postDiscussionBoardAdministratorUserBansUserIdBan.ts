import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUserBanCollector } from "../collectors/DiscussionBoardUserBanCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorUserBansUserIdBan(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  const registeredUser =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.userId },
      select: { id: true },
    });
  if (!registeredUser) {
    throw new HttpException("User not found", 404);
  }
  const data = await DiscussionBoardUserBanCollector.collect({
    body: props.body as any,
    registeredUser,
    administrator: { id: props.administrator.id },
  });
  const created = await MyGlobal.prisma.discussion_board_user_bans.create({
    data,
  });
  return {
    id: created.id as string & tags.Format<"uuid">,
    registered_user_id: created.registered_user_id as string &
      tags.Format<"uuid">,
    administrator_id: created.administrator_id ?? null,
    reason: created.reason,
    banned_at: toISOStringSafe(created.banned_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
