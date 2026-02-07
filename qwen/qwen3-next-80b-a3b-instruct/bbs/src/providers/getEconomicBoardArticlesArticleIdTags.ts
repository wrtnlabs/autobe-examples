import { IEconomicBoardSearchArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardArticlesArticleIdTags(props: {
  articleId: string;
}): Promise<IEconomicBoardSearchArticleTag[]> {
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, deleted_at: true },
  });
  if (!article) throw new HttpException("Article not found", 404);
  if (article.deleted_at !== null)
    throw new HttpException("Article deleted", 404);
  const tagAssociations =
    await MyGlobal.prisma.economic_board_search_article_tags.findMany({
      where: { article_id: props.articleId },
      orderBy: { id: "asc" },
    });
  if (tagAssociations.length === 0) return [];
  const tagIds = tagAssociations.map((t) => t.tag_id);
  const tags = await MyGlobal.prisma.economic_board_search_tags.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, text: true },
  });
  return tags.map((t) => ({ id: t.id, text: t.text }));
}
