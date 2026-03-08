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

export async function deleteDiscussionBoardSuperAdminBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const ban =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        discussion_board_member_id: true,
        administrator_id: true,
        unbanned_at: true,
      },
    });
  if (ban.unbanned_at !== null) {
    throw new HttpException("Ban record is already unbanned", 400);
  }
  await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: {
      unbanned_at: now,
      unban_reason: null,
      updated_at: now,
    },
  });
}
