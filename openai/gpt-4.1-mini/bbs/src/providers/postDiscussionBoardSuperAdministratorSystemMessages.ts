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

export async function postDiscussionBoardSuperAdministratorSystemMessages(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemMessage.ICreate;
}): Promise<IDiscussionBoardSystemMessage> {
  const now = toISOStringSafe(new Date());
  const body = props.body as any;
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const duplicate = await prisma.discussion_board_system_messages.findUnique({
      where: { code: body.code },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new HttpException("Message code already exists", 400);
    }
    const created = await prisma.discussion_board_system_messages.create({
      data: {
        id: v4(),
        code: body.code,
        message_text: body.message_text,
        message_type: body.message_type,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      code: created.code,
      message_text: created.message_text,
      message_type: created.message_type,
      created_at: created.created_at,
      updated_at: created.updated_at,
      deleted_at: null,
    };
  });
}
