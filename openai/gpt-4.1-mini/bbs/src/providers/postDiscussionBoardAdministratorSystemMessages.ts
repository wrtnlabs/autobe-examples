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

export async function postDiscussionBoardAdministratorSystemMessages(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemMessage.ICreate;
}): Promise<IDiscussionBoardSystemMessage> {
  const now = new Date().toISOString() as string &
    import("typia").tags.Format<"date-time">;

  const existing =
    await MyGlobal.prisma.discussion_board_system_messages.findUnique({
      where: { code: props.body.code },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException(
      `System message code '${props.body.code}' already exists.`,
      400,
    );
  }
  const data = {
    id: v4() as string & import("typia").tags.Format<"uuid">,
    code: props.body.code,
    message_text: props.body.messageText,
    message_type: props.body.messageType,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const created = await MyGlobal.prisma.discussion_board_system_messages.create(
    { data },
  );
  return await DiscussionBoardSystemMessageTransformer.transform(created);
}
