import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminArticlesArticleIdAttachments(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IRequest;
}): Promise<IPageIDiscussionBoardArticleAttachment.ISummary> {
  const { articleId, body } = props;

  // Ensure the article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Paging (enforce minimum/maximum constraints)
  const page = body.page !== undefined ? Number(body.page) : 1;
  const pageSize = body.pageSize !== undefined ? Number(body.pageSize) : 20;
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    throw new HttpException("Invalid page or pageSize", 400);
  }

  // Filtering (all optional fields handled safely)
  const where = {
    discussion_board_article_id: articleId,
    deleted_at: null,
    ...(body.kind !== undefined && { kind: body.kind }),
    ...(body.filename !== undefined && {
      filename: {
        contains: body.filename,
      },
    }),
    ...(body.filesizeMin !== undefined && {
      filesize: { gte: body.filesizeMin },
    }),
    ...(body.filesizeMax !== undefined && {
      filesize: { lte: body.filesizeMax },
    }),
    ...(body.createdFrom !== undefined || body.createdTo !== undefined
      ? {
          created_at: {
            ...(body.createdFrom !== undefined
              ? { gte: body.createdFrom }
              : {}),
            ...(body.createdTo !== undefined ? { lte: body.createdTo } : {}),
          },
        }
      : {}),
  };

  // Sort validation (allow only known sort fields)
  const allowedSortFields = ["created_at", "filename", "filesize"];
  const sortBy = allowedSortFields.includes(body.sortBy as any)
    ? (body.sortBy as "created_at" | "filename" | "filesize")
    : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Query attachments and count total
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_attachments.count({ where }),
    MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        filename: true,
        kind: true,
        mimetype: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      kind: row.kind,
      mimetype: row.mimetype,
    })),
  };
}
