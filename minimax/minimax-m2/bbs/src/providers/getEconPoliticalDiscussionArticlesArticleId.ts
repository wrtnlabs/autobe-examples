import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";

export async function getEconPoliticalDiscussionArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionArticle> {
  const article =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            status: true,
          },
        },
        econ_political_discussion_attachments: {
          select: {
            id: true,
            original_filename: true,
            file_type: true,
            file_size: true,
            file_url: true,
            upload_date: true,
            uploader_name: true,
            security_scan_status: true,
            moderation_status: true,
            is_public: true,
          },
          orderBy: { upload_date: "asc" },
        },
      },
    });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check if article has been soft-deleted
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    category: article.category,
    status: article.status,
    econ_political_discussion_user_id:
      article.econ_political_discussion_user_id,
    author: {
      id: article.author.id,
      display_name: article.author.display_name,
      avatar_url: article.author.avatar_url,
      status: article.author.status,
    },
    attachments: article.econ_political_discussion_attachments.map(
      (attachment: any) => ({
        id: attachment.id,
        article: {
          id: article.id,
          title: article.title,
          category: article.category,
          status: article.status,
          created_at: toISOStringSafe(article.created_at),
          updated_at: toISOStringSafe(article.updated_at),
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
      }),
    ),
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ?? undefined,
  };
}
