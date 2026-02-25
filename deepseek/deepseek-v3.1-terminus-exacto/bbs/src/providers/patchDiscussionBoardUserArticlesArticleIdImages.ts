import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserArticlesArticleIdImages(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  // Validate article exists and user has permission
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or access denied", 404);
  }
  // Build WHERE clause with proper optional handling
  const whereInput = {
    article: {
      id: props.articleId,
      deleted_at: null,
    },
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.display_order !== undefined &&
      props.body.display_order !== null && {
        display_order: props.body.display_order,
      }),
    ...(props.body.alt_text !== undefined &&
      props.body.alt_text !== null && {
        alt_text: { contains: props.body.alt_text },
      }),
    ...(props.body.caption !== undefined &&
      props.body.caption !== null && {
        caption: { contains: props.body.caption },
      }),
  } satisfies Prisma.discussion_board_article_imagesWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Sequential queries (not Promise.all)
  const data = await MyGlobal.prisma.discussion_board_article_images.findMany({
    where: whereInput,
    include: {
      imageFiles: true,
    },
    orderBy: { display_order: "asc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = data.map(
    (image) =>
      ({
        id: image.id as string & tags.Format<"uuid">,
        status: image.status,
        display_order: image.display_order as number & tags.Type<"int32">,
        alt_text: image.alt_text,
        caption: image.caption,
      }) satisfies IDiscussionBoardArticleFile.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
