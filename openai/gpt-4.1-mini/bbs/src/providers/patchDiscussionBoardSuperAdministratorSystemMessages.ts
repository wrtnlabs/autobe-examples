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
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(typeof (props.body as any).code === "string" &&
    (props.body as any).code.length > 0
      ? { code: (props.body as any).code }
      : {}),
    ...(typeof (props.body as any).message_type === "string" &&
    (props.body as any).message_type.length > 0
      ? { message_type: (props.body as any).message_type }
      : {}),
  } satisfies Prisma.discussion_board_system_messagesWhereInput;
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
    data: data.map((item) => ({
      id: item.id,
      code: item.code,
      message_text: item.message_text,
      message_type: item.message_type,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
