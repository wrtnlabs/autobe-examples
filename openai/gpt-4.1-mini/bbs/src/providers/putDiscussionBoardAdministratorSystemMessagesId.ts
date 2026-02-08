import { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
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

export async function putDiscussionBoardAdministratorSystemMessagesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemMessage.IUpdate;
}): Promise<IDiscussionBoardSystemMessage> {
  const record =
    await MyGlobal.prisma.discussion_board_system_messages.findUnique({
      where: { id: props.id },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("System message not found", 404);
  }
  // Since IUpdate is empty type, no fields to update. So no update operation is performed.
  // Return the found record as IDiscussionBoardSystemMessage - which is empty type, so returning {}
  return {};
}
