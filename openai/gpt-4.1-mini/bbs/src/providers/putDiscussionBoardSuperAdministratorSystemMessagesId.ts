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

export async function putDiscussionBoardSuperAdministratorSystemMessagesId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemMessage.IUpdate;
}): Promise<IDiscussionBoardSystemMessage> {
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_system_messages.findUniqueOrThrow({
      where: { id: props.id },
      select: { id: true },
    });
    await tx.discussion_board_system_messages.update({
      where: { id: props.id },
      data: {
        ...(props.body.code !== undefined && { code: props.body.code }),
        ...(props.body.message_text !== undefined && {
          message_text: props.body.message_text,
        }),
        ...(props.body.message_type !== undefined && {
          message_type: props.body.message_type,
        }),
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.discussion_board_system_messages.findUniqueOrThrow({
      where: { id: props.id },
      ...DiscussionBoardSystemMessageTransformer.select(),
    });
  return await DiscussionBoardSystemMessageTransformer.transform(updated);
}
