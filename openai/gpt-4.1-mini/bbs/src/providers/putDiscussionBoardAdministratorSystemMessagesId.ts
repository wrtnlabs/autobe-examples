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
import { DiscussionBoardSystemMessageTransformer } from "../transformers/DiscussionBoardSystemMessageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorSystemMessagesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemMessage.IUpdate;
}): Promise<IDiscussionBoardSystemMessage> {
  await MyGlobal.prisma.discussion_board_system_messages.findUniqueOrThrow({
    where: { id: props.id },
    select: { id: true },
  });
  const updateData: {
    code?: string;
    message_text?: string;
    message_type?: string;
  } = {};
  if (props.body.code !== undefined) {
    updateData.code = props.body.code;
  }
  if (props.body.message_text !== undefined) {
    updateData.message_text = props.body.message_text;
  }
  if (props.body.message_type !== undefined) {
    updateData.message_type = props.body.message_type;
  }
  await MyGlobal.prisma.discussion_board_system_messages.update({
    where: { id: props.id },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.discussion_board_system_messages.findUniqueOrThrow({
      where: { id: props.id },
      ...DiscussionBoardSystemMessageTransformer.select(),
    });
  return await DiscussionBoardSystemMessageTransformer.transform(updated);
}
