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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorSystemMessages(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemMessage.IRequest;
}): Promise<IPageIDiscussionBoardSystemMessage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_system_messagesWhereInput = {};
  if (typeof props.body.code === "string" && props.body.code.trim() !== "") {
    where.code = props.body.code;
  }
  if (
    typeof props.body.messageType === "string" &&
    props.body.messageType.trim() !== ""
  ) {
    where.message_type = props.body.messageType;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_messages.findMany({
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
    }),
    MyGlobal.prisma.discussion_board_system_messages.count({ where }),
  ]);
  const pageCount = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: data.map((item) => ({
      id: item.id,
      code: item.code,
      messageText: item.message_text,
      messageType: item.message_type,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: pageCount,
    },
  };
}
