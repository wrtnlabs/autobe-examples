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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleIdImages(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const data = await MyGlobal.prisma.discussion_board_article_images.findMany({
    where: {
      discussion_board_article_id: props.articleId,
    },
    skip,
    take: limit,
    orderBy: { display_order: "asc" },
  });
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: {
      discussion_board_article_id: props.articleId,
    },
  });
  return {
    data: data.map(() => ({})),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
