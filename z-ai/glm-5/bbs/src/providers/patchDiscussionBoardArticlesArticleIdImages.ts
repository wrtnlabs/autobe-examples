import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleImageAtSummaryTransformer } from "../transformers/DiscussionBoardArticleImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdImages(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IRequest;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  // Verify article exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const where = {
    discussion_board_article_id: props.articleId,
    ...(props.body.mime_type !== undefined && {
      mime_type: props.body.mime_type,
    }),
    ...(props.body.min_file_size !== undefined && {
      file_size: { gte: props.body.min_file_size },
    }),
    ...(props.body.max_file_size !== undefined && {
      file_size: { lte: props.body.max_file_size },
    }),
    ...(props.body.min_width !== undefined && {
      width: { gte: props.body.min_width },
    }),
    ...(props.body.max_width !== undefined && {
      width: { lte: props.body.max_width },
    }),
    ...(props.body.min_height !== undefined && {
      height: { gte: props.body.min_height },
    }),
    ...(props.body.max_height !== undefined && {
      height: { lte: props.body.max_height },
    }),
  } satisfies Prisma.discussion_board_article_imagesWhereInput;
  // Build ORDER BY from sort parameter
  const sortField = props.body.sort ?? "created_at";
  const isDescending = sortField.startsWith("-");
  const fieldName = isDescending ? sortField.slice(1) : sortField;
  const direction = isDescending ? "desc" : "asc";
  const orderBy = (
    fieldName === "file_size"
      ? { file_size: direction }
      : fieldName === "original_filename"
        ? { original_filename: direction }
        : { created_at: direction }
  ) satisfies Prisma.discussion_board_article_imagesOrderByWithRelationInput;
  // Query images with transformer select
  const images = await MyGlobal.prisma.discussion_board_article_images.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      ...DiscussionBoardArticleImageAtSummaryTransformer.select(),
    },
  );
  // Count total matching records
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      images,
      DiscussionBoardArticleImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
