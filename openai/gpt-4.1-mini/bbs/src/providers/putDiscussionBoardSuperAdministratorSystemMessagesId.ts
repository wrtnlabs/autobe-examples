import { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorSystemMessagesId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemMessage.IUpdate;
}): Promise<IDiscussionBoardSystemMessage> {
  const record =
    await MyGlobal.prisma.discussion_board_system_messages.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        code: true,
        message_text: true,
        message_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new HttpException("System message not found", 404);
  // No updatable fields in body, so no update operation.
  return {
    id: record.id,
    code: record.code,
    message_text: record.message_text,
    message_type: record.message_type,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
