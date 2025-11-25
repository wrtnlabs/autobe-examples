import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import { IPageIEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function patchEconPoliticalDiscussionArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionAttachment.IRequest;
}): Promise<IPageIEconPoliticalDiscussionAttachment.ISummary> {
  const { articleId } = props;
  const {
    page = 1,
    limit = 20,
    file_type,
    security_scan_status,
    moderation_status,
    is_public,
    order_by = "upload_date",
    order_direction = "desc",
  } = props.body;

  // Verify the article exists first
  const articleExists =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: articleId },
      select: { id: true },
    });

  if (!articleExists) {
    throw new HttpException("Article not found", 404);
  }

  // Build where conditions
  const whereConditions: Record<string, unknown> = {
    econ_political_discussion_article_id: articleId,
  };

  // Apply filters if provided
  if (file_type) {
    whereConditions.file_type = file_type;
  }

  if (security_scan_status) {
    whereConditions.security_scan_status =
      security_scan_status satisfies string as string;
  }

  if (moderation_status) {
    whereConditions.moderation_status =
      moderation_status satisfies string as string;
  }

  if (is_public !== undefined && is_public !== null) {
    whereConditions.is_public = is_public;
  }

  // Calculate pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build orderBy clause - validate against actual database fields
  const validOrderFields = [
    "upload_date",
    "file_size",
    "file_type",
    "original_filename",
  ];
  const orderField = validOrderFields.includes(order_by)
    ? order_by
    : "upload_date";
  const orderBy: Record<string, "asc" | "desc"> = {};
  orderBy[orderField] = order_direction;

  // Execute queries in parallel
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.econ_political_discussion_attachments.findMany({
      where: whereConditions,
      skip,
      take: limitNum,
      orderBy,
    }),
    MyGlobal.prisma.econ_political_discussion_attachments.count({
      where: whereConditions,
    }),
  ]);

  // Get article data separately since relationship include is not supported
  const article =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

  // Transform to DTO format
  const transformedAttachments = attachments.map((attachment) => ({
    id: attachment.id,
    original_filename: attachment.original_filename,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    upload_date: toISOStringSafe(attachment.upload_date),
    security_scan_status: attachment.security_scan_status satisfies string as
      | "clean"
      | "flagged"
      | "quarantined"
      | "pending"
      | "failed",
    moderation_status: attachment.moderation_status satisfies string as
      | "approved"
      | "rejected"
      | "pending",
    is_public: attachment.is_public,
    uploader: {
      id: v4() as string & tags.Format<"uuid">,
      display_name: attachment.uploader_name,
      avatar_url: undefined,
      status: "active",
    },
    article: article
      ? {
          id: article.id,
          title: article.title,
          category: article.category,
          status: article.status,
          created_at: toISOStringSafe(article.created_at),
          updated_at: toISOStringSafe(article.updated_at),
        }
      : {
          id: articleId,
          title: "",
          category: "",
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);

  return {
    data: transformedAttachments,
    pagination: {
      current: pageNum,
      limit: limitNum,
      records: total,
      pages: totalPages,
    },
  };
}
