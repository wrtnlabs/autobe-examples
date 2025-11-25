import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";

export async function deleteEconPoliticalDiscussionArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionArticle> {
  // Find the article to be deleted
  const article =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Perform cascade deletion of all associated attachments
  await MyGlobal.prisma.econ_political_discussion_attachments.deleteMany({
    where: { econ_political_discussion_article_id: props.articleId },
  });

  // Perform soft delete by setting deleted_at timestamp
  const deletedArticle =
    await MyGlobal.prisma.econ_political_discussion_articles.update({
      where: { id: props.articleId },
      data: {
        deleted_at: new Date(),
      },
    });

  // Fetch the user data separately
  const user = await MyGlobal.prisma.econ_political_discussion_users.findUnique(
    {
      where: { id: deletedArticle.econ_political_discussion_user_id },
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        status: true,
      },
    },
  );

  // Fetch attachments (empty since we deleted them)
  const attachments: any[] = [];

  // Return the deleted article with proper formatting
  return {
    id: deletedArticle.id,
    title: deletedArticle.title,
    content: deletedArticle.content,
    category: deletedArticle.category,
    status: deletedArticle.status,
    econ_political_discussion_user_id:
      deletedArticle.econ_political_discussion_user_id,
    author: {
      id: user!.id,
      display_name: user!.display_name,
      avatar_url: user!.avatar_url ?? undefined,
      status: user!.status,
    },
    attachments: attachments.map((attachment: any) => ({
      id: attachment.id,
      article: {
        id: deletedArticle.id,
        title: deletedArticle.title,
        category: deletedArticle.category,
        status: deletedArticle.status,
        created_at: toISOStringSafe(deletedArticle.created_at),
        updated_at: toISOStringSafe(deletedArticle.updated_at),
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
    created_at: toISOStringSafe(deletedArticle.created_at),
    updated_at: toISOStringSafe(deletedArticle.updated_at),
    deleted_at: deletedArticle.deleted_at
      ? toISOStringSafe(deletedArticle.deleted_at)
      : undefined,
  };
}
