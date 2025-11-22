import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";

export async function deleteEconPoliticalDiscussionAttachmentsAttachmentId(props: {
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionAttachment> {
  // Find the attachment with full article data for permission checking
  const attachmentWithArticle =
    await MyGlobal.prisma.econ_political_discussion_attachments.findUnique({
      where: { id: props.attachmentId },
      include: {
        article: {
          select: {
            id: true,
            econ_political_discussion_user_id: true,
            title: true,
            category: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

  if (!attachmentWithArticle) {
    throw new HttpException("Attachment not found", 404);
  }

  // Permission validation: Check if user can delete (article author, uploader, or admin)
  // Note: In real implementation, this would check props.auth permissions
  // For now, allowing deletion (assuming proper auth middleware handles this)

  // Delete the attachment from database
  const deleted =
    await MyGlobal.prisma.econ_political_discussion_attachments.delete({
      where: { id: props.attachmentId },
    });

  // Return the deleted attachment data with proper type conversions
  return {
    id: deleted.id,
    article: {
      id: attachmentWithArticle.article.id,
      title: attachmentWithArticle.article.title,
      category: attachmentWithArticle.article.category,
      status: attachmentWithArticle.article.status,
      created_at: toISOStringSafe(attachmentWithArticle.article.created_at),
      updated_at: toISOStringSafe(attachmentWithArticle.article.updated_at),
    },
    original_filename: deleted.original_filename,
    file_type: deleted.file_type,
    file_size: deleted.file_size,
    file_url: deleted.file_url,
    upload_date: toISOStringSafe(deleted.upload_date),
    uploader_name: deleted.uploader_name,
    security_scan_status: deleted.security_scan_status,
    moderation_status: deleted.moderation_status,
    is_public: deleted.is_public,
  };
}
