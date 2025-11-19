import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserArticlesArticleIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attachment and confirm linkage + not deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
      include: {
        article: true,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or already deleted.", 404);
  }
  if (
    !attachment.article ||
    (attachment.article.deleted_at !== null &&
      typeof attachment.article.deleted_at === "string")
  ) {
    throw new HttpException(
      "Cannot delete attachment from deleted article.",
      400,
    );
  }
  // Only author allowed
  if (attachment.article.user_id !== props.user.id) {
    throw new HttpException("No permission to delete this attachment.", 403);
  }
  // Set deleted_at timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.discussion_board_article_attachments.update({
    where: { id: props.attachmentId },
    data: {
      deleted_at: deletedAt,
    },
  });
}
