import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardArticlesArticleIdImages(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IRequest;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  const { articleId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;

  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [images, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_images.findMany({
      where: {
        discussion_board_article_id: articleId,
        ...(body.include_deleted !== true && { deleted_at: null }),
        ...(body.mime_type !== undefined &&
          body.mime_type !== null && {
            mime_type: body.mime_type,
          }),
        ...(body.search !== undefined &&
          body.search !== null && {
            original_name: {
              contains: body.search,
            },
          }),
        ...((body.min_width !== undefined && body.min_width !== null) ||
        (body.max_width !== undefined && body.max_width !== null)
          ? {
              width: {
                ...(body.min_width !== undefined &&
                  body.min_width !== null && { gte: body.min_width }),
                ...(body.max_width !== undefined &&
                  body.max_width !== null && { lte: body.max_width }),
              },
            }
          : {}),
        ...((body.min_height !== undefined && body.min_height !== null) ||
        (body.max_height !== undefined && body.max_height !== null)
          ? {
              height: {
                ...(body.min_height !== undefined &&
                  body.min_height !== null && { gte: body.min_height }),
                ...(body.max_height !== undefined &&
                  body.max_height !== null && { lte: body.max_height }),
              },
            }
          : {}),
        ...((body.min_size_bytes !== undefined &&
          body.min_size_bytes !== null) ||
        (body.max_size_bytes !== undefined && body.max_size_bytes !== null)
          ? {
              size_bytes: {
                ...(body.min_size_bytes !== undefined &&
                  body.min_size_bytes !== null && { gte: body.min_size_bytes }),
                ...(body.max_size_bytes !== undefined &&
                  body.max_size_bytes !== null && { lte: body.max_size_bytes }),
              },
            }
          : {}),
        ...((body.uploaded_after !== undefined &&
          body.uploaded_after !== null) ||
        (body.uploaded_before !== undefined && body.uploaded_before !== null)
          ? {
              created_at: {
                ...(body.uploaded_after !== undefined &&
                  body.uploaded_after !== null && { gte: body.uploaded_after }),
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
            : sortBy === "width"
              ? { width: sortOrder === "asc" ? "asc" : "desc" }
              : sortBy === "height"
                ? { height: sortOrder === "asc" ? "asc" : "desc" }
                : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_article_images.count({
      where: {
        discussion_board_article_id: articleId,
        ...(body.include_deleted !== true && { deleted_at: null }),
        ...(body.mime_type !== undefined &&
          body.mime_type !== null && {
            mime_type: body.mime_type,
          }),
        ...(body.search !== undefined &&
          body.search !== null && {
            original_name: {
              contains: body.search,
            },
          }),
        ...((body.min_width !== undefined && body.min_width !== null) ||
        (body.max_width !== undefined && body.max_width !== null)
          ? {
              width: {
                ...(body.min_width !== undefined &&
                  body.min_width !== null && { gte: body.min_width }),
                ...(body.max_width !== undefined &&
                  body.max_width !== null && { lte: body.max_width }),
              },
            }
          : {}),
        ...((body.min_height !== undefined && body.min_height !== null) ||
        (body.max_height !== undefined && body.max_height !== null)
          ? {
              height: {
                ...(body.min_height !== undefined &&
                  body.min_height !== null && { gte: body.min_height }),
                ...(body.max_height !== undefined &&
                  body.max_height !== null && { lte: body.max_height }),
              },
            }
          : {}),
        ...((body.min_size_bytes !== undefined &&
          body.min_size_bytes !== null) ||
        (body.max_size_bytes !== undefined && body.max_size_bytes !== null)
          ? {
              size_bytes: {
                ...(body.min_size_bytes !== undefined &&
                  body.min_size_bytes !== null && { gte: body.min_size_bytes }),
                ...(body.max_size_bytes !== undefined &&
                  body.max_size_bytes !== null && { lte: body.max_size_bytes }),
              },
            }
          : {}),
        ...((body.uploaded_after !== undefined &&
          body.uploaded_after !== null) ||
        (body.uploaded_before !== undefined && body.uploaded_before !== null)
          ? {
              created_at: {
                ...(body.uploaded_after !== undefined &&
                  body.uploaded_after !== null && { gte: body.uploaded_after }),
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

  const baseUrl = "/storage";

  const data = images.map((image) => {
    const url = `${baseUrl}/article-images/${image.stored_name}` as string &
      tags.Format<"uri">;

    return {
      id: image.id as string & tags.Format<"uuid">,
      url,
      original_name: image.original_name,
      mime_type: image.mime_type,
      size_bytes: image.size_bytes,
      width: image.width,
      height: image.height,
      created_at: toISOStringSafe(image.created_at),
      deleted_at: image.deleted_at
        ? toISOStringSafe(image.deleted_at)
        : undefined,
    } satisfies IDiscussionBoardArticleImage.ISummary;
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
