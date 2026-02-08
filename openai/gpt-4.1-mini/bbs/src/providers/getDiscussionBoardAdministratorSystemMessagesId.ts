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

export async function getDiscussionBoardAdministratorSystemMessagesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemMessage> {
  const record =
    await MyGlobal.prisma.discussion_board_system_messages.findUnique({
      where: { id: props.id },
    });
  if (!record) throw new HttpException("System message not found", 404);
  return {
    id: record.id,
    code: record.code,
    message_text: record.message_text,
    message_type: record.message_type,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
