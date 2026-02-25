import { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
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

export async function patchDiscussionBoardSuperAdministratorSystemMessages(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemMessage.IRequest;
}): Promise<IPageIDiscussionBoardSystemMessage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_system_messagesWhereInput = {};
  if (props.body.code !== undefined) {
    where.code = props.body.code;
  }
  if (props.body.messageType !== undefined) {
    where.message_type = props.body.messageType;
  }
  const data = await MyGlobal.prisma.discussion_board_system_messages.findMany({
    where,
    skip,
    take: limit,
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      message_text: true,
      message_type: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_system_messages.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      code: record.code,
      messageText: record.message_text,
      messageType: record.message_type,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
