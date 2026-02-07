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

export async function deleteDiscussionBoardUserArticlesArticleIdCommentsCommentIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for data consistency
  await MyGlobal.prisma.$transaction(async (tx) => {
    // First, validate that the article exists
    const article = await tx.discussion_board_articles.findFirst({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    });
    if (!article) {
      throw new HttpException("Article not found", 404);
    }
    // Validate that the comment exists and belongs to the specified article
    const comment = await tx.discussion_board_comments.findFirst({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    // Check if the authenticated user is the comment author
    const isCommentAuthor = comment.discussion_board_user_id === props.user.id;
    // If not comment author, check if user is an administrator
    if (!isCommentAuthor) {
      // For user payload, check if they have admin privileges through their type
      // Since UserPayload type is "user", they don't have admin privileges
      throw new HttpException(
        "You can only delete attachments from your own comments",
        403,
      );
    }
    // Validate that the attachment exists and is linked to the specified comment
    const attachment = await tx.discussion_board_comment_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_comment_id: props.commentId,
      },
    });
    if (!attachment) {
      throw new HttpException("Attachment not found", 404);
    }
    // Delete the attachment relationship
    await tx.discussion_board_comment_attachments.delete({
      where: {
        id: props.attachmentId,
      },
    });
  });
}
