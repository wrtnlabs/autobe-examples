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
import { EconomyPoliticsBoardArticleAtSummaryTransformer } from "../transformers/EconomyPoliticsBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardArticles(props: {
  body: IEconomyPoliticsBoardArticle.IRequest;
}): Promise<IPageIEconomyPoliticsBoardArticle.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const where: Prisma.economy_politics_board_articlesWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.economy_politics_board_articles.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      _count: {
        select: {
          economy_politics_board_article_comments: true,
        },
      },
      author: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.economy_politics_board_articles.count({
    where,
  });
  const summaryData = await ArrayUtil.asyncMap(
    data,
    EconomyPoliticsBoardArticleAtSummaryTransformer.transform,
  );
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
