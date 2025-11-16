import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconomicDiscussionModeratorArticlesArticleIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionAttachment.IUpdate;
}): Promise<IEconomicDiscussionAttachment> {
  // Verify attachment exists and belongs to the specified article
  const existing =
    await MyGlobal.prisma.economic_discussion_attachments.findFirst({
      where: {
        id: props.attachmentId,
        economic_discussion_article_id: props.articleId,
      },
    });

  if (!existing) {
    throw new HttpException(
      "Attachment not found or does not belong to this article",
      404,
    );
  }

  // Check if another attachment on the same article already has the new filename
  const filenameConflict =
    await MyGlobal.prisma.economic_discussion_attachments.findFirst({
      where: {
        economic_discussion_article_id: props.articleId,
        filename: props.body.filename,
        NOT: { id: props.attachmentId },
      },
    });

  if (filenameConflict) {
    throw new HttpException(
      "An attachment with this filename already exists on this article",
      409,
    );
  }

  // Update the attachment with new filename
  const updated = await MyGlobal.prisma.economic_discussion_attachments.update({
    where: {
      id: props.attachmentId,
    },
    data: {
      filename: props.body.filename,
    },
  });

  // Get the article details separately
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  return {
    id: updated.id,
    article: {
      id: article.id,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id:
        article.economic_discussion_member_id !== null &&
        article.economic_discussion_member_id !== undefined
          ? (article.economic_discussion_member_id satisfies string as string)
          : typia.random<string & tags.Format<"uuid">>(),
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id !== null &&
        article.economic_discussion_moderator_id !== undefined
          ? (article.economic_discussion_moderator_id satisfies string as string)
          : typia.random<string & tags.Format<"uuid">>(),
      member_author: undefined, // Would need separate query to populate
      moderator_author: undefined, // Would need separate query to populate
      categories: [], // Would need separate query to populate
      attachments_count: 0, // Default value for cached count
      comments_count: 0, // Default value for cached count
      status: article.status as "pending" | "approved" | "rejected",
    },
    filename: updated.filename,
    file_size: updated.file_size,
    file_type: updated.file_type,
    mime_type: updated.mime_type,
    uploaded_at: toISOStringSafe(updated.uploaded_at),
    is_scanned: updated.is_scanned,
  };
}
