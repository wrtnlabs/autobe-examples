import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function getEconPoliticalDiscussionArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionAttachment.ISummary[]> {
  // Verify the article exists first
  const article =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Fetch attachments with related article data
  const attachments =
    await MyGlobal.prisma.econ_political_discussion_attachments.findMany({
      where: { econ_political_discussion_article_id: props.articleId },
      include: {
        // Article information - use correct relation name 'article'
        article: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy: { upload_date: "desc" },
    });

  // Get unique uploader names and find corresponding users
  const uploaderNames = [...new Set(attachments.map((a) => a.uploader_name))];

  const users = await MyGlobal.prisma.econ_political_discussion_users.findMany({
    where: {
      display_name: { in: uploaderNames },
    },
  });

  // Create lookup map for users by display name
  const userLookup = new Map(users.map((user) => [user.display_name, user]));

  return attachments.map((attachment) => {
    const uploaderUser = userLookup.get(attachment.uploader_name);

    // Handle case where uploader user might not exist in database
    const fallbackUser = {
      id: v4() as string & tags.Format<"uuid">,
      display_name: attachment.uploader_name,
      avatar_url: undefined,
      status: "active",
    };

    const user = uploaderUser || fallbackUser;

    return {
      id: attachment.id,
      article: {
        id: attachment.article!.id,
        title: attachment.article!.title,
        category: attachment.article!.category,
        status: attachment.article!.status,
        created_at: toISOStringSafe(attachment.article!.created_at),
        updated_at: toISOStringSafe(attachment.article!.updated_at),
      },
      original_filename: attachment.original_filename,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
      uploader: {
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        status: user.status,
      },
      upload_date: toISOStringSafe(attachment.upload_date),
      security_scan_status: attachment.security_scan_status as
        | "clean"
        | "flagged"
        | "quarantined"
        | "pending"
        | "failed",
      moderation_status: attachment.moderation_status as
        | "approved"
        | "pending"
        | "rejected"
        | "flagged",
      is_public: attachment.is_public,
    };
  });
}
