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

export async function deleteDiscussionBoardAdministratorAdministratorUnbansUnbanId(props: {
  administrator: AdministratorPayload;
  unbanId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.discussion_board_user_unbans.findUniqueOrThrow({
    where: { id: props.unbanId },
  });
  await MyGlobal.prisma.discussion_board_user_unbans.delete({
    where: { id: props.unbanId },
  });
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      action: "delete_unban",
      target_id: props.unbanId,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
