import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const { articleId, commentId } = props;

  try {
    const record = await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: commentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    });

    if (!record) throw new HttpException("Not Found", 404);

    // Public endpoint: hidden or soft-deleted comments must not be disclosed
    if (record.is_hidden) throw new HttpException("Not Found", 404);

    return {
      id: record.id as string & tags.Format<"uuid">,
      articleId: record.discussion_board_article_id as string &
        tags.Format<"uuid">,
      parentCommentId:
        record.discussion_board_parent_comment_id === null
          ? undefined
          : (record.discussion_board_parent_comment_id as string &
              tags.Format<"uuid">),
      author: record.author
        ? {
            id: record.author.id as string & tags.Format<"uuid">,
            username: record.author.username,
            display_name: record.author.display_name ?? null,
            created_at: toISOStringSafe(record.author.created_at),
          }
        : null,
      content: record.content,
      isHidden: record.is_hidden,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: undefined,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
