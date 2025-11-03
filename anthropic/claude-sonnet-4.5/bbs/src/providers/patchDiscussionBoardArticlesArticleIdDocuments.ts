import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import { IPageIDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDocument";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardArticlesArticleIdDocuments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDocument.IRequest;
}): Promise<IPageIDiscussionBoardArticleDocument.ISummary> {
  const { articleId, body } = props;

  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: articleId },
  });

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [documents, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_documents.findMany({
      where: {
        discussion_board_article_id: articleId,
        ...(body.include_deleted !== true && { deleted_at: null }),
        ...(body.search !== undefined &&
          body.search !== null && {
            original_name: { contains: body.search },
          }),
        ...(body.mime_types !== undefined &&
          body.mime_types !== null &&
          body.mime_types.length > 0 && {
            mime_type: { in: body.mime_types },
          }),
        ...(body.min_size_bytes !== undefined &&
          body.min_size_bytes !== null && {
            size_bytes: { gte: body.min_size_bytes },
          }),
        ...(body.max_size_bytes !== undefined &&
          body.max_size_bytes !== null && {
            size_bytes: { lte: body.max_size_bytes },
          }),
        ...((body.uploaded_after !== undefined &&
          body.uploaded_after !== null) ||
        (body.uploaded_before !== undefined && body.uploaded_before !== null)
          ? {
              created_at: {
                ...(body.uploaded_after !== undefined &&
                  body.uploaded_after !== null && {
                    gte: body.uploaded_after,
                  }),
                ...(body.uploaded_before !== undefined &&
                  body.uploaded_before !== null && {
                    lte: body.uploaded_before,
                  }),
              },
            }
          : {}),
      },
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder === "asc" ? "asc" : "desc" }
          : sortBy === "size_bytes"
            ? { size_bytes: sortOrder === "asc" ? "asc" : "desc" }
            : sortBy === "original_name"
              ? { original_name: sortOrder === "asc" ? "asc" : "desc" }
              : { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_article_documents.count({
      where: {
        discussion_board_article_id: articleId,
        ...(body.include_deleted !== true && { deleted_at: null }),
        ...(body.search !== undefined &&
          body.search !== null && {
            original_name: { contains: body.search },
          }),
        ...(body.mime_types !== undefined &&
          body.mime_types !== null &&
          body.mime_types.length > 0 && {
            mime_type: { in: body.mime_types },
          }),
        ...(body.min_size_bytes !== undefined &&
          body.min_size_bytes !== null && {
            size_bytes: { gte: body.min_size_bytes },
          }),
        ...(body.max_size_bytes !== undefined &&
          body.max_size_bytes !== null && {
            size_bytes: { lte: body.max_size_bytes },
          }),
        ...((body.uploaded_after !== undefined &&
          body.uploaded_after !== null) ||
        (body.uploaded_before !== undefined && body.uploaded_before !== null)
          ? {
              created_at: {
                ...(body.uploaded_after !== undefined &&
                  body.uploaded_after !== null && {
                    gte: body.uploaded_after,
                  }),
                ...(body.uploaded_before !== undefined &&
                  body.uploaded_before !== null && {
                    lte: body.uploaded_before,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data = documents.map((doc) => {
    const summary: IDiscussionBoardArticleDocument.ISummary = {
      id: doc.id as string & tags.Format<"uuid">,
      url: `/api/documents/${doc.stored_name}` as string & tags.Format<"uri">,
      original_name: doc.original_name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
      created_at: toISOStringSafe(doc.created_at),
      deleted_at: doc.deleted_at ? toISOStringSafe(doc.deleted_at) : null,
    };
    return summary;
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
