import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdCommentsCommentId(props: {
  user: UserPayload;
  articleId: string;
  commentId: string;
}): Promise<void> {
  // 1. Verify article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // 2. Verify comment exists, belongs to article, and is not deleted
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_user_id: true,
      },
    });
  // Verify comment belongs to the specified article
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment does not belong to this article", 404);
  }
  // 3. Get current user's permission level for authorization
  const currentUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { permission_level: true },
    });
  // 4. Authorization check - user is comment author or has admin privileges
  const isAuthor = comment.discussion_board_user_id === props.user.id;
  const isAdmin =
    currentUser.permission_level === "ADMINISTRATOR" ||
    currentUser.permission_level === "SUPER_ADMINISTRATOR";
  if (!isAuthor && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Soft delete the comment by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
