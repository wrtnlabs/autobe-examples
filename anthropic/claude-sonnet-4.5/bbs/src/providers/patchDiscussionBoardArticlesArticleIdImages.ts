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
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      article_id: props.articleId,
    };

    if (!props.body.include_deleted) {
      conditions.deleted_at = null;
    }

    if (props.body.search) {
      conditions.original_filename = { contains: props.body.search };
    }

    if (props.body.original_filename) {
      conditions.original_filename = { contains: props.body.original_filename };
    }

    if (props.body.content_type) {
      conditions.content_type = props.body.content_type;
    }

    if (
      props.body.min_file_size !== null &&
      props.body.min_file_size !== undefined
    ) {
      const existing = conditions.file_size ? conditions.file_size : {};
      conditions.file_size = { ...existing, gte: props.body.min_file_size };
    }

    if (
      props.body.max_file_size !== null &&
      props.body.max_file_size !== undefined
    ) {
      const existing = conditions.file_size ? conditions.file_size : {};
      conditions.file_size = { ...existing, lte: props.body.max_file_size };
    }

    if (props.body.min_width !== null && props.body.min_width !== undefined) {
      const existing = conditions.width ? conditions.width : {};
      conditions.width = { ...existing, gte: props.body.min_width };
    }

    if (props.body.max_width !== null && props.body.max_width !== undefined) {
      const existing = conditions.width ? conditions.width : {};
      conditions.width = { ...existing, lte: props.body.max_width };
    }

    if (props.body.min_height !== null && props.body.min_height !== undefined) {
      const existing = conditions.height ? conditions.height : {};
      conditions.height = { ...existing, gte: props.body.min_height };
    }

    if (props.body.max_height !== null && props.body.max_height !== undefined) {
      const existing = conditions.height ? conditions.height : {};
      conditions.height = { ...existing, lte: props.body.max_height };
    }

    if (props.body.uploaded_after) {
      const existing = conditions.created_at ? conditions.created_at : {};
      conditions.created_at = { ...existing, gte: props.body.uploaded_after };
    }

    if (props.body.uploaded_before) {
      const existing = conditions.created_at ? conditions.created_at : {};
      conditions.created_at = { ...existing, lte: props.body.uploaded_before };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_images.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.discussion_board_article_images.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((image) => {
      const lastDotIndex = image.original_filename.lastIndexOf(".");
      const name =
        lastDotIndex > 0
          ? image.original_filename.substring(0, lastDotIndex)
          : image.original_filename;
      const extension =
        lastDotIndex > 0
          ? image.original_filename.substring(lastDotIndex + 1)
          : "";

      return {
        id: image.id,
        name,
        extension,
        url: image.storage_url,
        file_size: image.file_size,
        content_type: image.content_type,
        width: image.width ?? undefined,
        height: image.height ?? undefined,
        created_at: toISOStringSafe(image.created_at),
      };
    }),
  };
}
