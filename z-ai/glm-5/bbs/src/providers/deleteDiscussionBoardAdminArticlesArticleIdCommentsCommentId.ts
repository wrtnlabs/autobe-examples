import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Validate comment exists and is not deleted, and verify it belongs to the article
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
    });
  // Verify comment belongs to the specified article
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment not found in this article", 404);
  }
  // Soft delete the comment by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
