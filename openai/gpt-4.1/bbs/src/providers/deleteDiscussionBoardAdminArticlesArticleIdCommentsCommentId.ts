import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { articleId, commentId } = props;
  // First, ensure the comment exists for this article
  const comment =
    await MyGlobal.prisma.discussion_board_article_comments.findFirst({
      where: {
        id: commentId,
        discussion_board_article_id: articleId,
      },
    });
  if (!comment) {
    throw new HttpException("Comment not found in target article", 404);
  }
  // Perform hard delete
  await MyGlobal.prisma.discussion_board_article_comments.delete({
    where: { id: commentId },
  });
}
