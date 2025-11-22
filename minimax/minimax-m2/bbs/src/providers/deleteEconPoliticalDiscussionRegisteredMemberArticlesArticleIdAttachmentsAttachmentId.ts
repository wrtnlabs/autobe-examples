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
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function deleteEconPoliticalDiscussionRegisteredMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  registeredMember: RegisteredmemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionAttachment> {
  // Verify article exists and is not deleted
  const article =
    await MyGlobal.prisma.econ_political_discussion_articles.findFirst({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    });

  if (!article) {
    throw new HttpException("Article not found or has been deleted", 404);
  }

  // Verify attachment exists and belongs to the specified article
  const attachment =
    await MyGlobal.prisma.econ_political_discussion_attachments.findFirst({
      where: {
        id: props.attachmentId,
        econ_political_discussion_article_id: props.articleId,
      },
    });

  if (!attachment) {
    throw new HttpException(
      "Attachment not found or does not belong to specified article",
      404,
    );
  }

  // Verify authorization: article author or admin
  const isArticleAuthor =
    article.econ_political_discussion_user_id === props.registeredMember.id;
  const isAdmin = false; // TODO: Add admin role check when admin system is implemented

  if (!isArticleAuthor && !isAdmin) {
    throw new HttpException("Unauthorized to delete this attachment", 403);
  }

  // Delete the attachment from database
  const deletedAttachment =
    await MyGlobal.prisma.econ_political_discussion_attachments.delete({
      where: {
        id: props.attachmentId,
      },
    });

  // TODO: Delete physical file from cloud storage
  // This would involve calling storage service to remove file_url

  // Return deleted attachment data
  return {
    id: deletedAttachment.id,
    article: {
      id: article.id,
      title: article.title,
      category: article.category,
      status: article.status,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    },
    original_filename: deletedAttachment.original_filename,
    file_type: deletedAttachment.file_type,
    file_size: deletedAttachment.file_size,
    file_url: deletedAttachment.file_url,
    upload_date: toISOStringSafe(deletedAttachment.upload_date),
    uploader_name: deletedAttachment.uploader_name,
    security_scan_status: deletedAttachment.security_scan_status,
    moderation_status: deletedAttachment.moderation_status,
    is_public: deletedAttachment.is_public,
  };
}
