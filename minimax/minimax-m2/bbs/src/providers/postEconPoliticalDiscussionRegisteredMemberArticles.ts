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
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function postEconPoliticalDiscussionRegisteredMemberArticles(props: {
  registeredMember: RegisteredmemberPayload;
  body: IEconPoliticalDiscussionArticle.ICreate;
}): Promise<IEconPoliticalDiscussionArticle> {
  // Generate UUID for new article
  const articleId = v4() as string & tags.Format<"uuid">;

  // Create article in transaction with attachments
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create article
    const article = await tx.econ_political_discussion_articles.create({
      data: {
        id: articleId,
        title: props.body.title,
        content: props.body.content,
        category: props.body.category,
        status: props.body.status ?? "published",
        econ_political_discussion_user_id:
          props.body.econ_political_discussion_user_id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    // Create attachments if provided
    let attachments: any[] = [];
    if (props.body.attachments && props.body.attachments.length > 0) {
      const attachmentIds = props.body.attachments.map(
        () => v4() as string & tags.Format<"uuid">,
      );

      await tx.econ_political_discussion_attachments.createMany({
        data: props.body.attachments.map((attachment, index) => ({
          id: attachmentIds[index],
          econ_political_discussion_article_id: articleId,
          original_filename: attachment.original_filename,
          file_type: attachment.file_type,
          file_size: attachment.file_size,
          file_url: attachment.file_url,
          upload_date: toISOStringSafe(new Date()),
          uploader_name: attachment.uploader_name,
          security_scan_status: "pending",
          moderation_status: "pending",
          is_public: true,
        })),
      });

      // Fetch created attachments
      attachments = await tx.econ_political_discussion_attachments.findMany({
        where: { econ_political_discussion_article_id: articleId },
      });
    }

    // Fetch article with author info
    const articleWithAuthor =
      await tx.econ_political_discussion_articles.findUnique({
        where: { id: articleId },
        include: {
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
          },
        },
      });

    // Fetch author separately
    const author = await tx.econ_political_discussion_users.findUnique({
      where: { id: props.body.econ_political_discussion_user_id },
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        status: true,
      },
    });

    if (!author) {
      throw new HttpException("Author not found", 404);
    }

    return {
      article: articleWithAuthor,
      attachments,
      author,
    };
  });

  if (!result.article) {
    throw new HttpException("Article creation failed", 500);
  }

  // Transform to API response format
  return {
    id: result.article.id,
    title: result.article.title,
    content: result.article.content,
    category: result.article.category,
    status: result.article.status,
    econ_political_discussion_user_id:
      result.article.econ_political_discussion_user_id,
    author: {
      id: result.author.id,
      display_name: result.author.display_name,
      avatar_url: result.author.avatar_url,
      status: result.author.status,
    },
    attachments: result.attachments.map((attachment) => ({
      id: attachment.id,
      article: {
        id: result.article!.id,
        title: result.article!.title,
        category: result.article!.category,
        status: result.article!.status,
        created_at: toISOStringSafe(result.article!.created_at),
        updated_at: toISOStringSafe(result.article!.updated_at),
      },
      original_filename: attachment.original_filename,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
      file_url: attachment.file_url,
      upload_date: attachment.upload_date,
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
}
