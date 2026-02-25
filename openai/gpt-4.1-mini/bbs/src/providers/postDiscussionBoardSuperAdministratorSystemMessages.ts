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
import { DiscussionBoardSystemMessageTransformer } from "../transformers/DiscussionBoardSystemMessageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorSystemMessages(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemMessage.ICreate;
}): Promise<IDiscussionBoardSystemMessage> {
  // Current time as ISO string with proper tag
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  // Check for duplicate code with active record
  const existing =
    await MyGlobal.prisma.discussion_board_system_messages.findFirst({
      where: { code: props.body.code, deleted_at: null },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Duplicate code", 409);
  }
  const id: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_system_messages.create({
      data: {
        id,
        code: props.body.code,
        message_text: props.body.messageText,
        message_type: props.body.messageType,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
  const record =
    await MyGlobal.prisma.discussion_board_system_messages.findUniqueOrThrow({
      where: { id },
      ...DiscussionBoardSystemMessageTransformer.select(),
    });
  return await DiscussionBoardSystemMessageTransformer.transform(record);
}
