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

export async function putDiscussionBoardUserArticlesArticleIdCommentsCommentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.IUpdate;
}): Promise<IDiscussionBoardArticleComment> {
  const now = toISOStringSafe(new Date());
  const comment =
    await MyGlobal.prisma.discussion_board_article_comments.findUnique({
      where: { id: props.commentId },
      include: {
        authorUser: true,
        article: true,
      },
    });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment does not belong to target article", 400);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted comment", 404);
  }
  if (comment.article.deleted_at !== null) {
    throw new HttpException("Cannot edit comment under deleted article", 404);
  }
  if (comment.author_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: cannot edit another user's comment",
      403,
    );
  }
  const updated =
    await MyGlobal.prisma.discussion_board_article_comments.update({
      where: { id: props.commentId },
      data: {
        body: props.body.body ?? comment.body,
        updated_at: now,
      },
    });
  const author: IDiscussionBoardUser.ISummary = {
    id: comment.authorUser.id,
    display_name: comment.authorUser.display_name,
    avatar_url: comment.authorUser.avatar_url ?? null,
  };
  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    author,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
