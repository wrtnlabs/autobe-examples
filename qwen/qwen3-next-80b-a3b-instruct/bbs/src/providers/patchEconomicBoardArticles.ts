import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleAtSummaryTransformer } from "../transformers/EconomicBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticles(props: {
  body: IEconomicBoardArticle.IRequest;
}): Promise<IPageIEconomicBoardArticle.ISummary> {
  const {
    section_id,
    tag,
    search,
    sort = "newest",
    page = 1,
    limit = 20,
  } = props.body;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_board_articlesWhereInput = {
    is_deleted: false,
    ...(section_id && { section_id }),
    ...(tag && { articleTags: { some: { tag } } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
  const orderByInput: Prisma.economic_board_articlesOrderByWithRelationInput =
    sort === "newest" ? { created_at: "desc" } : { created_at: "asc" };
  const data = await MyGlobal.prisma.economic_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EconomicBoardArticleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_board_articles.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
