import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminActorsActorIdBan(props: {
  superAdmin: SuperadminPayload;
  actorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const banRecord = await prisma.discussion_board_ban_records.findFirst({
      where: {
        discussion_board_member_id: props.actorId,
        deleted_at: null,
      },
    });
    if (banRecord === null) {
      throw new HttpException("Ban record not found", 404);
    }
    await prisma.discussion_board_ban_records.update({
      where: { id: banRecord.id },
      data: {
        deleted_at: now,
        unban_reason: props.body.unban_reason ?? null,
        updated_at: now,
      },
    });
    await prisma.discussion_board_members.update({
      where: { id: props.actorId },
      data: {
        is_banned: false,
        updated_at: now,
      },
    });
  });
}
