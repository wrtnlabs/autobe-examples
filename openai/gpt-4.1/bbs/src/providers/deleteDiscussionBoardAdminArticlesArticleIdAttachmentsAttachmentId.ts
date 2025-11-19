import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the article
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: { id: true, user_id: true, deleted_at: true },
  });
  if (!article) {
    throw new HttpException("Article not found or is deleted", 404);
  }

  // Fetch the attachment, ensure it matches the article and is not already deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: { id: props.attachmentId },
      select: { id: true, article_id: true, file_uri: true, deleted_at: true },
    });
  if (
    !attachment ||
    attachment.deleted_at !== null ||
    attachment.article_id !== props.articleId
  ) {
    throw new HttpException(
      "Attachment not found, already deleted, or mismatched to the article",
      404,
    );
  }

  // Only the article author or an admin can delete
  if (article.user_id !== props.admin.id && props.admin.type !== "admin") {
    throw new HttpException(
      "Forbidden: Only the author or an admin may delete attachments",
      403,
    );
  }

  // Soft delete the attachment
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_article_attachments.update({
    where: { id: props.attachmentId },
    data: { deleted_at: now },
  });
  // Note: File removal from storage is assumed to be handled elsewhere.
}
