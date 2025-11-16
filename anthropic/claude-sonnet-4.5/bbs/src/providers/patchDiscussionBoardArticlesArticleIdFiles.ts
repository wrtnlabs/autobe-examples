import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardArticlesArticleIdFiles(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_files.findMany({
      where: {
        article: {
          id: props.articleId,
        },
        ...(props.body.include_deleted ? {} : { deleted_at: null }),
        ...(props.body.search && {
          original_filename: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
        ...(props.body.name && {
          original_filename: { contains: props.body.name, mode: "insensitive" },
        }),
        ...(props.body.content_type !== undefined &&
          props.body.content_type !== null && {
            content_type: props.body.content_type,
          }),
        ...(props.body.extension !== undefined &&
          props.body.extension !== null && {
            original_filename: {
              contains: `.${props.body.extension}`,
              mode: "insensitive",
            },
          }),
        ...((props.body.min_size !== undefined &&
          props.body.min_size !== null) ||
        (props.body.max_size !== undefined && props.body.max_size !== null)
          ? {
              file_size: {
                ...(props.body.min_size !== undefined &&
                  props.body.min_size !== null && { gte: props.body.min_size }),
                ...(props.body.max_size !== undefined &&
                  props.body.max_size !== null && { lte: props.body.max_size }),
              },
            }
          : {}),
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
      skip: sortBy === "extension" ? undefined : skip,
      take: sortBy === "extension" ? undefined : limit,
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "size"
            ? { file_size: sortOrder }
            : sortBy === "name"
              ? { original_filename: sortOrder }
              : { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_article_files.count({
      where: {
        article: {
          id: props.articleId,
        },
        ...(props.body.include_deleted ? {} : { deleted_at: null }),
        ...(props.body.search && {
          original_filename: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
        ...(props.body.name && {
          original_filename: { contains: props.body.name, mode: "insensitive" },
        }),
        ...(props.body.content_type !== undefined &&
          props.body.content_type !== null && {
            content_type: props.body.content_type,
          }),
        ...(props.body.extension !== undefined &&
          props.body.extension !== null && {
            original_filename: {
              contains: `.${props.body.extension}`,
              mode: "insensitive",
            },
          }),
        ...((props.body.min_size !== undefined &&
          props.body.min_size !== null) ||
        (props.body.max_size !== undefined && props.body.max_size !== null)
          ? {
              file_size: {
                ...(props.body.min_size !== undefined &&
                  props.body.min_size !== null && { gte: props.body.min_size }),
                ...(props.body.max_size !== undefined &&
                  props.body.max_size !== null && { lte: props.body.max_size }),
              },
            }
          : {}),
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

  let processedData = data.map((file) => {
    const lastDotIndex = file.original_filename.lastIndexOf(".");
    const extension =
      lastDotIndex !== -1
        ? file.original_filename.substring(lastDotIndex + 1)
        : "";

    return {
      id: file.id,
      name: file.original_filename,
      extension: extension,
      url: file.storage_url,
      size: file.file_size,
      content_type: file.content_type,
    };
  });

  if (sortBy === "extension") {
    processedData.sort((a, b) => {
      const compareResult = a.extension.localeCompare(b.extension);
      return sortOrder === "asc" ? compareResult : -compareResult;
    });
    processedData = processedData.slice(skip, skip + limit);
  }

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: processedData,
  };
}
