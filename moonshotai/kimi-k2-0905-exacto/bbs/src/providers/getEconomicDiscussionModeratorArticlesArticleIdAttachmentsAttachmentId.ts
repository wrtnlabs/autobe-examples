import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getEconomicDiscussionModeratorArticlesArticleIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionAttachment> {
  // Retrieve the attachment with its associated article
  const attachment =
    await MyGlobal.prisma.economic_discussion_attachments.findUnique({
      where: { id: props.attachmentId },
      include: { article: true },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Verify the attachment belongs to the specified article
  if (attachment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to specified article",
      404,
    );
  }

  // Get article-related data in parallel for efficiency
  const [
    categories,
    attachmentsCount,
    commentsCount,
    memberDetail,
    moderatorDetail,
  ] = await Promise.all([
    // Get categories associated with the article
    MyGlobal.prisma.economic_discussion_article_categories.findMany({
      where: { economic_discussion_article_id: props.articleId },
      include: { category: true },
    }),
    // Count attachments for this article
    MyGlobal.prisma.economic_discussion_attachments.count({
      where: { economic_discussion_article_id: props.articleId },
    }),
    // Count comments for this article
    MyGlobal.prisma.economic_discussion_comments.count({
      where: { economic_discussion_article_id: props.articleId },
    }),
    // Get member author details if applicable
    attachment.article.economic_discussion_member_id
      ? MyGlobal.prisma.economic_discussion_members.findUnique({
          where: { id: attachment.article.economic_discussion_member_id },
        })
      : Promise.resolve(null),
    // Get moderator author details if applicable
    attachment.article.economic_discussion_moderator_id
      ? MyGlobal.prisma.economic_discussion_moderators.findUnique({
          where: { id: attachment.article.economic_discussion_moderator_id },
        })
      : Promise.resolve(null),
  ]);

  // Build the article summary with proper optional field handling
  const articleSummary: IEconomicDiscussionArticle.ISummary = {
    id: attachment.article.id,
    title: attachment.article.title,
    view_count: attachment.article.view_count,
    created_at: toISOStringSafe(attachment.article.created_at),
    updated_at: toISOStringSafe(attachment.article.updated_at),
    economic_discussion_member_id:
      attachment.article.economic_discussion_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    economic_discussion_moderator_id:
      attachment.article.economic_discussion_moderator_id ??
      typia.random<string & tags.Format<"uuid">>(),
    member_author: memberDetail
      ? {
          id: memberDetail.id,
          username: memberDetail.username,
          email_verified: memberDetail.email_verified,
          reputation_score: memberDetail.reputation_score,
          created_at: toISOStringSafe(memberDetail.created_at),
        }
      : undefined,
    moderator_author: moderatorDetail
      ? {
          id: moderatorDetail.id,
          username: moderatorDetail.username,
          moderation_level: moderatorDetail.moderation_level as
            | "admin"
            | "standard"
            | "senior",
          created_at: toISOStringSafe(moderatorDetail.created_at),
        }
      : undefined,
    categories: categories.map((cat) => ({
      id: cat.category.id,
      code: cat.category.code,
      name: cat.category.name,
      display_order: cat.category.display_order,
      is_active: cat.category.is_active,
      article_count: 0,
    })),
    attachments_count: attachmentsCount,
    comments_count: commentsCount,
    status: attachment.article.status as "pending" | "approved" | "rejected",
  };

  return {
    id: attachment.id,
    article: articleSummary,
    filename: attachment.filename,
    file_size: attachment.file_size,
    file_type: attachment.file_type,
    mime_type: attachment.mime_type,
    uploaded_at: toISOStringSafe(attachment.uploaded_at),
    is_scanned: attachment.is_scanned,
  };
}
