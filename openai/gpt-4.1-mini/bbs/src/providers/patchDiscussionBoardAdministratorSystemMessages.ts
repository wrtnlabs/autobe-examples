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
  // Default pagination
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Since IRequest doesn't have code, message_type, sort, page, or limit, filters and sorting omitted
  const where: Prisma.discussion_board_system_messagesWhereInput = {
    deleted_at: null,
  };
  // Use the correct property selection for Prisma according to DB schema
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
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_system_messages.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      code: record.code,
      message_text: record.message_text,
      message_type: record.message_type,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
