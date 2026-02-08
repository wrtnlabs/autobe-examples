import { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUserUnbanCollector } from "../collectors/DiscussionBoardUserUnbanCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorUserBansBanIdUnban(props: {
  administrator: AdministratorPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserUnban.ICreate;
}): Promise<IDiscussionBoardUserUnban> {
  const ban = await MyGlobal.prisma.discussion_board_user_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
    },
  });
  if (ban === null) {
    throw new HttpException("User ban not found", 404);
  }
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.administrator.id },
      select: {
        id: true,
      },
    });
  if (administrator === null) {
    throw new HttpException("Administrator not found", 404);
  }
  const created = await MyGlobal.prisma.discussion_board_user_unbans.create({
    data: await DiscussionBoardUserUnbanCollector.collect({
      body: props.body,
      userBan: ban,
      administrator: administrator,
    }),
  });
  return {
    id: created.id,
    user_ban_id: created.user_ban_id,
    administrator_id: created.administrator_id,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
