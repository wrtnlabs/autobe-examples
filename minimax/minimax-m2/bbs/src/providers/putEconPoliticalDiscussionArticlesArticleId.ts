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

export async function putEconPoliticalDiscussionArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionArticle.IUpdate;
}): Promise<IEconPoliticalDiscussionArticle> {
  // Step 1: Retrieve the existing article to verify existence and ownership
  const existingArticle =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!existingArticle) {
    throw new HttpException("Article not found", 404);
  }

  // Step 2: Authorization check - verify user is the author
  // In a real implementation, this would be extracted from the authentication context
  // For now, using a mock auth context that should be replaced with actual implementation
  const mockAuthUserId = "user-uuid-placeholder"; // This should be replaced with actual auth extraction

  if (existingArticle.econ_political_discussion_user_id !== mockAuthUserId) {
    throw new HttpException(
      "Forbidden - only the author can update this article",
      403,
    );
  }

  // Step 3: Prepare update data - only include provided fields, handling null vs undefined correctly
  const updateData: Record<string, unknown> = {
    // Always update the updated_at timestamp
    updated_at: new Date(),
  };

  // Handle optional fields that can be set to null or updated to new values
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }

  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }

  if (props.body.category !== undefined) {
    updateData.category = props.body.category;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Handle deleted_at specifically - convert string to Date if provided
  if (props.body.deleted_at !== undefined) {
    if (props.body.deleted_at === null) {
      updateData.deleted_at = null;
    } else if (props.body.deleted_at) {
      updateData.deleted_at = new Date(props.body.deleted_at);
    }
  }

  // Step 4: Perform the update operation
  const updatedArticle =
    await MyGlobal.prisma.econ_political_discussion_articles.update({
      where: { id: props.articleId },
      data: updateData,
    });

  // Step 5: Fetch related data separately
  const [author, attachments] = await Promise.all([
    // Fetch author information
    MyGlobal.prisma.econ_political_discussion_users.findUnique({
      where: { id: updatedArticle.econ_political_discussion_user_id },
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        status: true,
      },
    }),
    // Fetch attachments for this article
    MyGlobal.prisma.econ_political_discussion_attachments.findMany({
      where: { econ_political_discussion_article_id: updatedArticle.id },
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
    }),
  ]);

  // Step 6: Format the response according to the API interface
  // Convert all Date objects to ISO strings and handle optional fields correctly
  return {
    id: updatedArticle.id,
    title: updatedArticle.title,
    content: updatedArticle.content,
    category: updatedArticle.category,
    status: updatedArticle.status,
    econ_political_discussion_user_id:
      updatedArticle.econ_political_discussion_user_id,
    author: {
      id: author!.id,
      display_name: author!.display_name,
      avatar_url: author!.avatar_url ?? undefined,
      status: author!.status,
    },
    attachments:
      attachments.length > 0
        ? attachments.map(
            (attachment: {
              id: string;
              original_filename: string;
              file_type: string;
              file_size: number;
              file_url: string;
              upload_date: Date;
              uploader_name: string;
              security_scan_status: string;
              moderation_status: string;
              is_public: boolean;
            }) => ({
              id: attachment.id,
              article: {
                id: updatedArticle.id,
                title: updatedArticle.title,
                category: updatedArticle.category,
                status: updatedArticle.status,
                created_at: toISOStringSafe(updatedArticle.created_at),
                updated_at: toISOStringSafe(updatedArticle.updated_at),
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
          )
        : undefined,
    created_at: toISOStringSafe(updatedArticle.created_at),
    updated_at: toISOStringSafe(updatedArticle.updated_at),
    deleted_at: updatedArticle.deleted_at
      ? toISOStringSafe(updatedArticle.deleted_at)
      : undefined,
  };
}
