import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReplies";
import { IPageIEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardReplies";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconomicBoardPostsPostIdReplies(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconomicBoardReplies.IRequest;
}): Promise<IPageIEconomicBoardReplies> {
  const { postId, body } = props;

  // Default values for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Default sort parameters
  const sortField = body.sort ?? "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build where clause directly inline
  const where = {
    economic_board_post_id: postId,
    ...(body.search !== undefined && { content: { contains: body.search } }),
  };

  // Perform query with pagination and sorting
  const [replies, total] = await Promise.all([
    MyGlobal.prisma.economic_board_replies.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_replies.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: replies.map((reply) => ({
      ...reply,
      created_at: toISOStringSafe(reply.created_at),
      updated_at: toISOStringSafe(reply.updated_at),
    })),
  } satisfies IPageIEconomicBoardReplies;
}
