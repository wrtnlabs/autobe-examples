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
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function putEconPoliticalDiscussionRegisteredMemberArticlesArticleId(props: {
  registeredMember: RegisteredmemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionArticle.IUpdate;
}): Promise<IEconPoliticalDiscussionArticle> {
  // Find existing article
  const existing =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!existing) {
    throw new HttpException("Article not found", 404);
  }

  // Verify ownership - only author can update their article
  if (
    existing.econ_political_discussion_user_id !== props.registeredMember.id
  ) {
    throw new HttpException(
      "Forbidden - can only update your own articles",
      403,
    );
  }

  // Build update data with correct Prisma type
  const updateData: Prisma.econ_political_discussion_articlesUpdateInput = {
    updated_at: new Date(),
  };

  // Only include fields that are explicitly provided
  if (props.body.title !== null && props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== null && props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.category !== null && props.body.category !== undefined) {
    updateData.category = props.body.category;
  }
  if (props.body.status !== null && props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.deleted_at !== null && props.body.deleted_at !== undefined) {
    updateData.deleted_at = props.body.deleted_at;
  }

  // Update the article
  const updated =
    await MyGlobal.prisma.econ_political_discussion_articles.update({
      where: { id: props.articleId },
      data: updateData,
    });

  // Get author and attachments in separate queries
  const [author, attachments] = await Promise.all([
    MyGlobal.prisma.econ_political_discussion_users.findFirst({
      where: { id: updated.econ_political_discussion_user_id },
    }),
    MyGlobal.prisma.econ_political_discussion_attachments.findMany({
      where: {
        econ_political_discussion_article_id: props.articleId,
        moderation_status: { not: "rejected" },
      },
    }),
  ]);

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  // Return formatted response
  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    category: updated.category,
    status: updated.status,
    econ_political_discussion_user_id:
      updated.econ_political_discussion_user_id,
    author: {
      id: author.id,
      display_name: author.display_name,
      avatar_url: author.avatar_url,
      status: author.status,
    },
    attachments: attachments.map((attachment: any) => ({
      id: attachment.id,
      article: {
        id: updated.id,
        title: updated.title,
        category: updated.category,
        status: updated.status,
        created_at: toISOStringSafe(updated.created_at),
        updated_at: toISOStringSafe(updated.updated_at),
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
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
