import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function postEconPoliticalDiscussionArticles(props: {
  body: IEconPoliticalDiscussionArticle.ICreate;
}): Promise<IEconPoliticalDiscussionArticle> {
  const { body } = props;

  // Validate that the referenced author exists
  const author =
    await MyGlobal.prisma.econ_political_discussion_users.findUnique({
      where: { id: body.econ_political_discussion_user_id },
    });

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  // Create the article and optionally handle attachments in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Generate UUID for the new article
    const articleId = v4() as string & tags.Format<"uuid">;
    const now = new Date();

    // Create the main article record
    const article = await tx.econ_political_discussion_articles.create({
      data: {
        id: articleId,
        title: body.title,
        content: body.content,
        category: body.category,
        status: body.status ?? "published",
        econ_political_discussion_user_id:
          body.econ_political_discussion_user_id,
        created_at: now,
        updated_at: now,
      },
    });

    // Handle attachments if provided
    if (body.attachments && body.attachments.length > 0) {
      const attachments = await Promise.all(
        body.attachments.map((attachment) =>
          tx.econ_political_discussion_attachments.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              econ_political_discussion_article_id: articleId,
              original_filename: attachment.original_filename,
              file_type: attachment.file_type,
              file_size: attachment.file_size,
              file_url: attachment.file_url,
              upload_date: now,
              uploader_name: attachment.uploader_name,
              security_scan_status: "pending",
              moderation_status: "pending",
              is_public: true,
            },
          }),
        ),
      );

      return {
        article,
        attachments,
      };
    }

    return {
      article,
      attachments: [],
    };
  });

  // Construct the response with author information
  const response: IEconPoliticalDiscussionArticle = {
    id: result.article.id,
    title: result.article.title,
    content: result.article.content,
    category: result.article.category,
    status: result.article.status,
    econ_political_discussion_user_id:
      result.article.econ_political_discussion_user_id,
    author: {
      id: author.id,
      display_name: author.display_name,
      avatar_url: author.avatar_url,
      status: author.status,
    },
    attachments: result.attachments.map((attachment) => ({
      id: attachment.id,
      article: {
        id: result.article.id,
        title: result.article.title,
        category: result.article.category,
        status: result.article.status,
        created_at: toISOStringSafe(result.article.created_at),
        updated_at: toISOStringSafe(result.article.updated_at),
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
    })),
    created_at: toISOStringSafe(result.article.created_at),
    updated_at: toISOStringSafe(result.article.updated_at),
    deleted_at: result.article.deleted_at
      ? toISOStringSafe(result.article.deleted_at)
      : null,
  };

  return response;
}
