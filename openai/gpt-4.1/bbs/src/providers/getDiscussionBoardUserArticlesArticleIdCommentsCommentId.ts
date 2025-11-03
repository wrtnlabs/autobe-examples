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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getDiscussionBoardUserArticlesArticleIdCommentsCommentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleComment> {
  const { user, articleId, commentId } = props;

  const comment =
    await MyGlobal.prisma.discussion_board_article_comments.findFirst({
      where: {
        id: commentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      include: {
        authorUser: true,
      },
    });
  if (!comment) {
    throw new HttpException("Comment not found or inaccessible", 404);
  }
  if (comment.author_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this comment",
      403,
    );
  }

  return {
    id: comment.id,
    discussion_board_article_id: comment.discussion_board_article_id,
    author: {
      id: comment.authorUser.id,
      display_name: comment.authorUser.display_name,
      avatar_url: comment.authorUser.avatar_url ?? undefined,
    },
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at !== null && comment.deleted_at !== undefined
        ? toISOStringSafe(comment.deleted_at)
        : undefined,
  };
}
