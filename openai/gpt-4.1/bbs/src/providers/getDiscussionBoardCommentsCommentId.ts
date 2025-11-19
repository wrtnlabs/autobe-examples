import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";

export async function getDiscussionBoardCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      user: true, // discussion_board_users
      article: {
        include: {
          user: true, // to build IDiscussionBoardArticle.ISummary
        },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Map user (author)
  const author = comment.user;
  if (!author) {
    throw new HttpException("Comment author not found", 500);
  }
  // Map article
  const article = comment.article;
  if (!article || !article.user) {
    throw new HttpException("Parent article or its user is missing", 500);
  }
  return {
    id: comment.id,
    author: {
      id: author.id,
      email: author.email,
      created_at: toISOStringSafe(author.created_at),
      updated_at: toISOStringSafe(author.updated_at),
      deleted_at: author.deleted_at
        ? toISOStringSafe(author.deleted_at)
        : undefined,
    },
    article: {
      id: article.id,
      title: article.title,
      user: {
        id: article.user.id,
        email: article.user.email,
        created_at: toISOStringSafe(article.user.created_at),
        updated_at: toISOStringSafe(article.user.updated_at),
        deleted_at: article.user.deleted_at
          ? toISOStringSafe(article.user.deleted_at)
          : undefined,
      },
      created_at: toISOStringSafe(article.created_at),
      updated_at: article.updated_at
        ? toISOStringSafe(article.updated_at)
        : undefined,
    },
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
