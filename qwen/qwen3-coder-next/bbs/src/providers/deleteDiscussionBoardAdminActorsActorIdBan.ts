import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminActorsActorIdBan(props: {
  admin: AdminPayload;
  actorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findFirst({
      where: {
        discussion_board_member_id: props.actorId,
        deleted_at: null,
      },
    });
  if (banRecord === null) {
    throw new HttpException("Ban record not found", 404);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_ban_records.update({
      where: { id: banRecord.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_members.update({
      where: { id: props.actorId },
      data: {
        is_banned: false,
        updated_at: now,
      },
    }),
  ]);
}
