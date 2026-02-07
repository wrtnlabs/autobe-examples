import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardArticleTagAtSummaryTransformer } from "../transformers/EconomyPoliticsBoardArticleTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardArticlesArticleIdTags(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardArticle.IRequest;
}): Promise<IPageIEconomyPoliticsBoardArticle.ISummary> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.economy_politics_board_articles.findUnique({
      where: { id: props.articleId },
    });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Process pagination parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Fetch tag data with transformer settings
  const data =
    await MyGlobal.prisma.economy_politics_board_article_tags.findMany({
      where: {
        economy_politics_board_article_id: props.articleId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EconomyPoliticsBoardArticleTagAtSummaryTransformer.select(),
    });
  // Fetch total count
  const total = await MyGlobal.prisma.economy_politics_board_article_tags.count(
    {
      where: {
        economy_politics_board_article_id: props.articleId,
        deleted_at: null,
      },
    },
  );
  // Transform and normalize results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomyPoliticsBoardArticleTagAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
