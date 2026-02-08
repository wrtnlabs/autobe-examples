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

export async function deleteDiscussionBoardAdministratorSystemMessagesId(props: {
  administrator: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "administrator";
  };
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const systemMessage =
    await MyGlobal.prisma.discussion_board_system_messages.findUnique({
      where: { id: props.id },
    });
  if (!systemMessage) throw new HttpException("System message not found", 404);
  await MyGlobal.prisma.discussion_board_system_messages.delete({
    where: { id: props.id },
  });
}
