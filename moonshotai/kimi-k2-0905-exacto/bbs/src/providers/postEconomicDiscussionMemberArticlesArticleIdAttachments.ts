import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import { IAttachmentFilename } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachmentFilename";
import { IFileSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileSize";
import { IFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileType";
import { IMimeType } from "@ORGANIZATION/PROJECT-api/lib/structures/IMimeType";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconomicDiscussionMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionAttachment.ICreate;
}): Promise<IEconomicDiscussionAttachment> {
  // Verify article exists and member has permission to attach files
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check if member is the article author
  if (article.economic_discussion_member_id !== props.member.id) {
    throw new HttpException(
      "You can only attach files to your own articles",
      403,
    );
  }

  // Validate attachment count (max 5 per article)
  const attachmentCount =
    await MyGlobal.prisma.economic_discussion_attachments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

  if (attachmentCount >= 5) {
    throw new HttpException("Maximum 5 attachments allowed per article", 400);
  }

  // Validate file type against allowed formats
  const allowedMimeTypes: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/gif"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    spreadsheet: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  };

  if (!allowedMimeTypes[props.body.file_type]?.includes(props.body.mime_type)) {
    throw new HttpException(
      `Invalid MIME type for ${props.body.file_type}`,
      400,
    );
  }

  // Validate file size limits (per schema: 5MB images, 10MB docs/spreadsheets)
  const maxSizes = {
    image: 5242880, // 5MB
    document: 10485760, // 10MB
    spreadsheet: 10485760, // 10MB
  };

  if (props.body.file_size > maxSizes[props.body.file_type]) {
    throw new HttpException(
      `File size exceeds limit for ${props.body.file_type}`,
      400,
    );
  }

  // Generate secure file path
  const filePath = `/uploads/articles/${props.articleId}/${props.body.filename}`;
  const now = new Date();

  // Create attachment with system-generated metadata
  const attachment =
    await MyGlobal.prisma.economic_discussion_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_discussion_article_id: props.articleId,
        filename: props.body.filename,
        file_path: filePath,
        file_size: props.body.file_size,
        file_type: props.body.file_type,
        mime_type: props.body.mime_type,
        uploaded_at: now,
        is_scanned: false,
      },
    });

  // Build article summary for response
  const articleSummary: IEconomicDiscussionArticle.ISummary = {
    id: article.id,
    title: article.title,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    economic_discussion_member_id:
      article.economic_discussion_member_id as string & tags.Format<"uuid">,
    economic_discussion_moderator_id: article.economic_discussion_moderator_id
      ? (article.economic_discussion_moderator_id satisfies string as string)
      : ("00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">),
    member_author: undefined, // Member context provided via auth
    moderator_author: undefined, // Not applicable for member-created articles
    categories: [], // Categories not loaded for efficiency
    attachments_count: attachmentCount + 1,
    comments_count: 0, // Default for new attachments
    status: article.status as "pending" | "approved" | "rejected",
  };

  return {
    id: attachment.id,
    article: articleSummary,
    filename: attachment.filename,
    file_size: attachment.file_size,
    file_type: attachment.file_type as IFileType,
    mime_type: attachment.mime_type as IMimeType,
    uploaded_at: toISOStringSafe(attachment.uploaded_at),
    is_scanned: attachment.is_scanned,
  };
}
