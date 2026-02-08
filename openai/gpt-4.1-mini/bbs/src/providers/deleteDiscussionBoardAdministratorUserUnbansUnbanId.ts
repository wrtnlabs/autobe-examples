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

export async function deleteDiscussionBoardAdministratorUserUnbansUnbanId(props: {
  administrator: AdministratorPayload;
  unbanId: string & tags.Format<"uuid">;
}): Promise<void> {
  const unban = await MyGlobal.prisma.discussion_board_user_unbans.findUnique({
    where: { id: props.unbanId },
  });
  if (!unban) throw new HttpException("Unban record not found", 404);
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_user_unbans.delete({
      where: { id: props.unbanId },
    });
    await tx.discussion_board_audit_logs.create({
      data: {
        id: v4(),
        actor_id: props.administrator.id,
        event_type: "DELETE_UNBAN",
        event_description: `Deleted unban record with id ${props.unbanId}`,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
}
