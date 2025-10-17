import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import { IPageIDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardReply";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardDiscussionBoardPostsPostIdDiscussionBoardReplies(props: {
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardReply.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardReply.ISummary> {
  const { postId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where = {
    post_id: postId,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        content: { contains: body.search },
      }),
    ...(body.filter_status !== undefined &&
      body.filter_status !== null && {
        reply_status: body.filter_status,
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_replies.findMany({
      where,
      orderBy: body.sort_by
        ? { [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc" }
        : { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        reply_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_replies.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      content: r.content,
      reply_status: r.reply_status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
