import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardComments(props: {
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { authorId, content, createdAfter, createdBefore } = props.body;

  const where: Prisma.discussion_board_commentsWhereInput = {
    ...(authorId && { user_id: authorId }),
    ...(content && { content: { contains: content } }),
    ...(createdAfter && { created_at: { gte: new Date(createdAfter) } }),
    ...(createdBefore && { created_at: { lte: new Date(createdBefore) } }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      skip: 0,
      take: 100,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  return {
    data: data.map((comment) => ({
      id: comment.id,
      content_preview: comment.content.substring(0, 100),
      created_at: toISOStringSafe(comment.created_at),
    })),
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    },
  };
}
