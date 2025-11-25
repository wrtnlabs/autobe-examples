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

export async function postEconPoliticalDiscussionArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionAttachment.ICreate;
}): Promise<IEconPoliticalDiscussionAttachment> {
  // Verify article exists before processing attachment
  const article =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Create attachment record with proper UUID and timestamps
  const attachment =
    await MyGlobal.prisma.econ_political_discussion_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        econ_political_discussion_article_id: props.articleId,
        original_filename: props.body.original_filename,
        file_type: props.body.file_type,
        file_size: props.body.file_size,
        file_url: props.body.file_url,
        upload_date: toISOStringSafe(new Date()),
        uploader_name: props.body.uploader_name,
        security_scan_status: "pending",
        moderation_status: "pending",
        is_public: true,
      },
    });

  // Return response with proper format conversions
  return {
    id: attachment.id,
    original_filename: attachment.original_filename,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    file_url: attachment.file_url,
    upload_date: toISOStringSafe(attachment.upload_date),
    uploader_name: attachment.uploader_name,
    security_scan_status: attachment.security_scan_status,
    moderation_status: attachment.moderation_status,
    is_public: attachment.is_public,
    article: {
      id: article.id,
      title: article.title,
      category: article.category,
      status: article.status,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    },
  };
}
