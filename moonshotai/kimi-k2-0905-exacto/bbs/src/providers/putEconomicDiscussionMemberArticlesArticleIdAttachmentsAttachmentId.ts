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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconomicDiscussionMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionAttachment.IUpdate;
}): Promise<IEconomicDiscussionAttachment> {
  // Find the attachment and verify it exists
  const attachment =
    await MyGlobal.prisma.economic_discussion_attachments.findUnique({
      where: { id: props.attachmentId },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Verify the attachment belongs to the specified article
  if (attachment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      404,
    );
  }

  // Find the article and verify member ownership in a single query
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: {
        id: props.articleId,
      },
      include: {
        member: true,
        moderator: true,
      },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Verify the member owns this article
  if (
    !article.economic_discussion_member_id ||
    article.economic_discussion_member_id !== props.member.id
  ) {
    throw new HttpException(
      "You do not have permission to update attachments for this article",
      403,
    );
  }

  // Get categories for the article
  const articleCategories =
    await MyGlobal.prisma.economic_discussion_article_categories.findMany({
      where: { economic_discussion_article_id: props.articleId },
      include: {
        category: true,
      },
    });

  // Get attachment count for the article
  const attachmentsCount =
    await MyGlobal.prisma.economic_discussion_attachments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

  // Get comment count for the article
  const commentsCount =
    await MyGlobal.prisma.economic_discussion_comments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

  // Update the attachment with the new filename
  const updatedAttachment =
    await MyGlobal.prisma.economic_discussion_attachments.update({
      where: { id: props.attachmentId },
      data: {
        filename: props.body.filename,
      },
    });

  // Build the article summary for the response
  const articleSummary: IEconomicDiscussionArticle.ISummary = {
    id: article.id,
    title: article.title,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    economic_discussion_member_id: article.economic_discussion_member_id,
    economic_discussion_moderator_id:
      article.economic_discussion_moderator_id !== null
        ? typia.assert<string & tags.Format<"uuid">>(
            article.economic_discussion_moderator_id,
          )
        : typia.assert<string & tags.Format<"uuid">>(
            "00000000-0000-0000-0000-000000000000",
          ),
    member_author: article.member
      ? {
          id: article.member.id,
          username: article.member.username,
          email_verified: article.member.email_verified,
          reputation_score: article.member.reputation_score,
          created_at: toISOStringSafe(article.member.created_at),
        }
      : undefined,
    moderator_author: undefined, // Member articles won't have moderator author
    categories: articleCategories.map((ac) => ({
      id: ac.category.id,
      name: ac.category.name,
      code: ac.category.code,
      is_active: ac.category.is_active,
      display_order: ac.category.display_order,
      article_count: 0, // Would need separate query, but interface requires it
    })),
    attachments_count: attachmentsCount,
    comments_count: commentsCount,
    status: article.status as "pending" | "approved" | "rejected",
  };

  // Return the updated attachment
  return {
    id: updatedAttachment.id,
    article: articleSummary,
    filename: updatedAttachment.filename,
    file_size: updatedAttachment.file_size,
    file_type: updatedAttachment.file_type,
    mime_type: updatedAttachment.mime_type,
    uploaded_at: toISOStringSafe(updatedAttachment.uploaded_at),
    is_scanned: updatedAttachment.is_scanned,
  };
}
