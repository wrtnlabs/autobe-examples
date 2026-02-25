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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdImages(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  // Validate article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Build WHERE clause (removed 'deleted_at' as it doesn't exist in the Prisma type)
  const whereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.display_order && {
      display_order: props.body.display_order,
    }),
    ...(props.body.alt_text && { alt_text: { contains: props.body.alt_text } }),
    ...(props.body.caption && { caption: { contains: props.body.caption } }),
  } satisfies Prisma.discussion_board_article_imagesWhereInput;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Get data
  const data = await MyGlobal.prisma.discussion_board_article_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { display_order: "asc" as const },
    select: {
      id: true,
      status: true,
      display_order: true,
      alt_text: true,
      caption: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
    data: data.map((item) => ({
      id: item.id,
      status: item.status,
      display_order: item.display_order,
      alt_text: item.alt_text,
      caption: item.caption,
    })),
  };
}
