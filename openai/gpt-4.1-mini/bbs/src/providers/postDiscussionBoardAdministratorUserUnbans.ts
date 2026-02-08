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

export async function postDiscussionBoardAdministratorUserUnbans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserUnban.ICreate;
}): Promise<IDiscussionBoardUserUnban> {
  const user_ban_id = (props.body as any)
    .user_ban_id satisfies string as string;
  const reason = (props.body as any).reason satisfies string as string;
  if (!reason || reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  const userBan = await MyGlobal.prisma.discussion_board_user_bans.findFirst({
    where: {
      id: user_ban_id,
      deleted_at: null,
    },
  });
  if (!userBan) throw new HttpException("User ban not found", 404);
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
    });
  if (!administrator) throw new HttpException("Administrator not found", 404);
  const createInput = await DiscussionBoardUserUnbanCollector.collect({
    body: props.body,
    userBan,
    administrator,
  });
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    return await prisma.discussion_board_user_unbans.create({
      data: createInput,
    });
  });
  return {
    id: created.id,
    user_ban_id: created.user_ban_id,
    administrator_id: created.administrator_id,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
