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

export async function postEconomicDiscussionMemberArticlesArticleIdAttachmentFiles(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionAttachment.ICreate;
}): Promise<IEconomicDiscussionAttachment> {
  // Verify article exists and check ownership
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
      include: {
        economic_discussion_comments: true,
      },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check ownership: members can only add attachments to their own articles
  if (article.economic_discussion_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - can only add attachments to your own articles",
      403,
    );
  }

  // Check attachment limit (max 5 per article)
  const attachmentCount =
    await MyGlobal.prisma.economic_discussion_attachments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

  if (attachmentCount >= 5) {
    throw new HttpException("Maximum 5 attachments per article allowed", 400);
  }

  // Validate file size limits based on file type
  const maxFileSizes = {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    spreadsheet: 10 * 1024 * 1024, // 10MB
  };

  if (props.body.file_size > maxFileSizes[props.body.file_type]) {
    throw new HttpException(
      `${props.body.file_type} files must not exceed ${maxFileSizes[props.body.file_type] / (1024 * 1024)}MB`,
      400,
    );
  }

  // Generate file path (would be handled by actual file upload service in real implementation)
  const filePath = `/uploads/articles/${props.articleId}/${v4()}_${props.body.filename}`;

  // Create attachment
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
        uploaded_at: new Date(),
        is_scanned: false,
      },
    });

  // Get updated attachment count for response
  const totalAttachments = attachmentCount + 1;
  const totalComments =
    await MyGlobal.prisma.economic_discussion_comments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

  // Fetch article data separately
  const articleData =
    await MyGlobal.prisma.economic_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!articleData) {
    throw new HttpException("Article data could not be retrieved", 404);
  }

  // Return formatted response
  return {
    id: attachment.id,
    article: {
      id: articleData.id,
      title: articleData.title,
      view_count: articleData.view_count,
      created_at: toISOStringSafe(articleData.created_at),
      updated_at: toISOStringSafe(articleData.updated_at),
      economic_discussion_member_id: typia.assert<string & tags.Format<"uuid">>(
        (articleData.economic_discussion_member_id satisfies string | null as
          | string
          | null
          | undefined)!,
      ),
      economic_discussion_moderator_id: typia.assert<
        string & tags.Format<"uuid">
      >(
        (articleData.economic_discussion_moderator_id satisfies
          | string
          | null as string | null | undefined)!,
      ),
      member_author: undefined, // Cannot be resolved without proper includes
      moderator_author: undefined, // Cannot be resolved without proper includes
      categories: [], // Categories require separate lookup
      attachments_count: totalAttachments,
      comments_count: totalComments,
      status: articleData.status as "pending" | "approved" | "rejected",
    },
    filename: attachment.filename,
    file_size: attachment.file_size,
    file_type: attachment.file_type,
    mime_type: attachment.mime_type,
    uploaded_at: toISOStringSafe(attachment.uploaded_at),
    is_scanned: attachment.is_scanned,
  };
}
