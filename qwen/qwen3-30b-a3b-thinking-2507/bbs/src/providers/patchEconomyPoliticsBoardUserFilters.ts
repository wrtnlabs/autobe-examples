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
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardArticleAtSummaryTransformer } from "../transformers/EconomyPoliticsBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardUserFilters(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardArticle.IRequest;
}): Promise<IPageIEconomyPoliticsBoardArticle.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const selectOptions = {
    id: true,
    title: true,
    created_at: true,
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
    author: {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    },
    _count: true,
    content: true,
    updated_at: true,
    deleted_at: true,
    economy_politics_board_article_attachments: true,
    economy_politics_board_article_tags: true,
    economy_politics_board_search_results: true,
  };
  const data = await MyGlobal.prisma.economy_politics_board_articles.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: selectOptions,
  });
  const total = await MyGlobal.prisma.economy_politics_board_articles.count({
    where: { deleted_at: null },
  });
  const transformedData = await ArrayUtil.asyncMap(data, (item) =>
    EconomyPoliticsBoardArticleAtSummaryTransformer.transform(item),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
