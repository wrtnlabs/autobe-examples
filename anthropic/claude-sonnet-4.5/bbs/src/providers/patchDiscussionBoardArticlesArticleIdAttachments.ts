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

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IRequest;
}): Promise<IPageIDiscussionBoardArticleAttachment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
        ...(props.body.type !== undefined &&
          props.body.type !== null && {
            type: props.body.type,
          }),
        ...(props.body.format !== undefined &&
          props.body.format !== null && {
            format: props.body.format,
          }),
        ...((props.body.min_size !== undefined &&
          props.body.min_size !== null) ||
        (props.body.max_size !== undefined && props.body.max_size !== null)
          ? {
              size: {
                ...(props.body.min_size !== undefined &&
                  props.body.min_size !== null && {
                    gte: props.body.min_size,
                  }),
                ...(props.body.max_size !== undefined &&
                  props.body.max_size !== null && {
                    lte: props.body.max_size,
                  }),
              },
            }
          : {}),
        ...(props.body.filename_search !== undefined &&
          props.body.filename_search !== null && {
            original_filename: {
              contains: props.body.filename_search,
              mode: "insensitive" as const,
            },
          }),
        ...((props.body.uploaded_after !== undefined &&
          props.body.uploaded_after !== null) ||
        (props.body.uploaded_before !== undefined &&
          props.body.uploaded_before !== null)
          ? {
              created_at: {
                ...(props.body.uploaded_after !== undefined &&
                  props.body.uploaded_after !== null && {
                    gte: new Date(props.body.uploaded_after),
                  }),
                ...(props.body.uploaded_before !== undefined &&
                  props.body.uploaded_before !== null && {
                    lte: new Date(props.body.uploaded_before),
                  }),
              },
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "size"
            ? { size: sortOrder }
            : { original_filename: sortOrder },
    }),
    MyGlobal.prisma.discussion_board_article_attachments.count({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
        ...(props.body.type !== undefined &&
          props.body.type !== null && {
            type: props.body.type,
          }),
        ...(props.body.format !== undefined &&
          props.body.format !== null && {
            format: props.body.format,
          }),
        ...((props.body.min_size !== undefined &&
          props.body.min_size !== null) ||
        (props.body.max_size !== undefined && props.body.max_size !== null)
          ? {
              size: {
                ...(props.body.min_size !== undefined &&
                  props.body.min_size !== null && {
                    gte: props.body.min_size,
                  }),
                ...(props.body.max_size !== undefined &&
                  props.body.max_size !== null && {
                    lte: props.body.max_size,
                  }),
              },
            }
          : {}),
        ...(props.body.filename_search !== undefined &&
          props.body.filename_search !== null && {
            original_filename: {
              contains: props.body.filename_search,
              mode: "insensitive" as const,
            },
          }),
        ...((props.body.uploaded_after !== undefined &&
          props.body.uploaded_after !== null) ||
        (props.body.uploaded_before !== undefined &&
          props.body.uploaded_before !== null)
          ? {
              created_at: {
                ...(props.body.uploaded_after !== undefined &&
                  props.body.uploaded_after !== null && {
                    gte: new Date(props.body.uploaded_after),
                  }),
                ...(props.body.uploaded_before !== undefined &&
                  props.body.uploaded_before !== null && {
                    lte: new Date(props.body.uploaded_before),
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    data: data.map((attachment) => ({
      id: attachment.id,
      discussion_board_article_id: attachment.discussion_board_article_id,
      discussion_board_member_id: attachment.discussion_board_member_id,
      type: attachment.type,
      format: attachment.format,
      size: attachment.size,
      original_filename: attachment.original_filename,
      storage_path: attachment.storage_path,
      created_at: toISOStringSafe(attachment.created_at),
      updated_at: toISOStringSafe(attachment.updated_at),
      deleted_at: attachment.deleted_at
        ? toISOStringSafe(attachment.deleted_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
