import { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemMessageCollector } from "../collectors/DiscussionBoardSystemMessageCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorSystemMessages(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemMessage.ICreate;
}): Promise<IDiscussionBoardSystemMessage> {
  const { body } = props;
  const data = await DiscussionBoardSystemMessageCollector.collect({ body });
  const existing =
    await MyGlobal.prisma.discussion_board_system_messages.findUnique({
      where: { code: data.code },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException(
      `System message code '${data.code}' already exists.`,
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.discussion_board_system_messages.create({
      data: {
        ...data,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
  return {
    id: created.id,
    code: created.code,
    message_text: created.message_text,
    message_type: created.message_type,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
