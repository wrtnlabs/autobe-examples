import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserComments(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        content: true,
        author: {
          select: { display_name: true },
        },
        article: {
          select: { id: true },
        },
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    data: comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      author_display_name: comment.author.display_name,
      article_id: comment.article.id,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
