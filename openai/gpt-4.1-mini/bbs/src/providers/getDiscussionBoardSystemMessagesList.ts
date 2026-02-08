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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSystemMessagesList(): Promise<IPageIDiscussionBoardSystemMessage.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  try {
    const data =
      await MyGlobal.prisma.discussion_board_system_messages.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          code: true,
          message_text: true,
          message_type: true,
        },
      });
    const total = await MyGlobal.prisma.discussion_board_system_messages.count({
      where: { deleted_at: null },
    });
    return {
      data: data.map((message) => ({
        code: message.code,
        message_text: message.message_text,
        message_type: message.message_type,
      })),
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve system messages", 500);
  }
}
