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
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicBoardArticleAtSummaryTransformer } from "../transformers/EconomicBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardCitizenSearches(props: {
  citizen: CitizenPayload;
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
  // Validate search term length
  if (search !== undefined && (search.length < 3 || search.length > 100)) {
    throw new HttpException(
      "Search term must be between 3 and 100 characters",
      400,
    );
  }
  // Validate pagination bounds
  if (page < 1 || page > 100) {
    throw new HttpException("Page must be between 1 and 100", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.economic_board_articlesWhereInput = {
    is_deleted: false,
    ...(section_id && { section_id }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
  // Handle tag filtering (AND logic for multiple tags)
  if (tag) {
    where.articleTags = {
      some: { tag: tag },
    };
  }
  // Determine order by
  const orderBy: Prisma.economic_board_articlesOrderByWithRelationInput =
    sort === "oldest" ? { created_at: "asc" } : { created_at: "desc" };
  // Fetch data and total count in sequence
  const data = await MyGlobal.prisma.economic_board_articles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EconomicBoardArticleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_board_articles.count({
    where,
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
