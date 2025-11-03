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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleComment> {
  const comment =
    await MyGlobal.prisma.discussion_board_article_comments.findFirst({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        author_user_id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!comment) throw new HttpException("Comment not found", 404);

  const author = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: comment.author_user_id,
    },
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
    },
  });
  if (!author) throw new HttpException("Author not found", 404);

  return {
    id: comment.id,
    discussion_board_article_id: comment.discussion_board_article_id,
    author: {
      id: author.id,
      display_name: author.display_name,
      avatar_url: author.avatar_url === null ? undefined : author.avatar_url,
    },
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null
        ? undefined
        : toISOStringSafe(comment.deleted_at),
  };
}
