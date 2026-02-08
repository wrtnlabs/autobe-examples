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

export async function putDiscussionBoardAdministratorUserUnbansUnbanId(props: {
  administrator: AdministratorPayload;
  unbanId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserUnban.IUpdate;
}): Promise<IDiscussionBoardUserUnban> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_user_unbans.update({
    where: { id: props.unbanId },
    data: {
      updated_at: now,
    },
  });
  if (!updated) {
    throw new HttpException("User unban record not found", 404);
  }
  return {
    id: updated.id,
    user_ban_id: updated.user_ban_id,
    administrator_id: updated.administrator_id,
    reason: updated.reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
