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
  // Validate article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Build WHERE clause with type safety
  const whereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.display_order_min !== undefined ||
    props.body.display_order_max !== undefined
      ? {
          display_order: {
            ...(props.body.display_order_min !== undefined && {
              gte: props.body.display_order_min,
            }),
            ...(props.body.display_order_max !== undefined && {
              lte: props.body.display_order_max,
            }),
          } satisfies Prisma.IntFilter,
        }
      : {}),
    ...(props.body.alt_text !== undefined
      ? props.body.alt_text === null
        ? { alt_text: null }
        : { alt_text: { contains: props.body.alt_text } }
      : {}),
    ...(props.body.caption !== undefined
      ? props.body.caption === null
        ? { caption: null }
        : { caption: { contains: props.body.caption } }
      : {}),
  } satisfies Prisma.discussion_board_article_imagesWhereInput;
  // Pagination parameters with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Sort order with explicit default
  const orderByInput = (
    props.body.sort === "display_order_asc"
      ? { display_order: "asc" as const }
      : { display_order: "desc" as const }
  ) satisfies Prisma.discussion_board_article_imagesOrderByWithRelationInput;
  // Get paginated data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_images.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardArticleImageAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_article_images.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleImageAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
