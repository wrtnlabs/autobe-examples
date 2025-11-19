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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleComment> {
  // 1. Fetch comment including related author and article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      user: true,
      article: {
        include: { user: true },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found.", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted.", 400);
  }
  if (comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException("You are not allowed to delete this comment.", 403);
  }
  // 2. Perform soft-delete by updating deleted_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });
  // 3. Map to IDiscussionBoardArticleComment
  return {
    id: updated.id,
    author: {
      id: comment.user.id,
      email: comment.user.email,
      created_at: toISOStringSafe(comment.user.created_at),
      updated_at: toISOStringSafe(comment.user.updated_at),
      deleted_at: comment.user.deleted_at
        ? toISOStringSafe(comment.user.deleted_at)
        : undefined,
    },
    article: {
      id: comment.article.id,
      title: comment.article.title,
      user: {
        id: comment.article.user.id,
        email: comment.article.user.email,
        created_at: toISOStringSafe(comment.article.user.created_at),
        updated_at: toISOStringSafe(comment.article.user.updated_at),
        deleted_at: comment.article.user.deleted_at
          ? toISOStringSafe(comment.article.user.deleted_at)
          : undefined,
      },
      created_at: toISOStringSafe(comment.article.created_at),
      updated_at: toISOStringSafe(comment.article.updated_at),
    },
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
