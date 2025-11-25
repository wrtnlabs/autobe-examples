import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function getEconPoliticalDiscussionRegisteredMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  registeredMember: RegisteredmemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionAttachment> {
  // Fetch the attachment and verify it belongs to the specified article
  const attachment =
    await MyGlobal.prisma.econ_political_discussion_attachments.findFirst({
      where: {
        id: props.attachmentId,
        econ_political_discussion_article_id: props.articleId,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });

  if (!attachment) {
    throw new HttpException(
      "Attachment not found or does not belong to the specified article",
      404,
    );
  }

  // Verify the article exists and is not deleted
  if (!attachment.article || attachment.article.deleted_at) {
    throw new HttpException("Article not found or has been deleted", 404);
  }

  // Check security scan status - only allow access to clean files or for administrative purposes
  const isOwner = attachment.uploader_name === props.registeredMember.id;

  if (attachment.security_scan_status === "quarantined") {
    throw new HttpException(
      "Attachment has been quarantined for security reasons",
      403,
    );
  }

  // Return the complete attachment metadata
  return {
    id: attachment.id,
    article: {
      id: attachment.article.id,
      title: attachment.article.title,
      category: attachment.article.category,
      status: attachment.article.status,
      created_at: toISOStringSafe(attachment.article.created_at),
      updated_at: toISOStringSafe(attachment.article.updated_at),
    },
    original_filename: attachment.original_filename,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    file_url: attachment.file_url,
    upload_date: toISOStringSafe(attachment.upload_date),
    uploader_name: attachment.uploader_name,
    security_scan_status: attachment.security_scan_status,
    moderation_status: attachment.moderation_status,
    is_public: attachment.is_public,
  };
}
