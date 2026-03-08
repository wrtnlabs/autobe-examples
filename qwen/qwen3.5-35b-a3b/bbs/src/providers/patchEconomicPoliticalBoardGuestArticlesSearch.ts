import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardGuestArticlesSearch(props: {
  guest: GuestPayload;
  body: IEconomicPoliticalBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit !== undefined
      ? props.body.limit
      : (props.body.pageSize ?? 20);
  const safeLimit = limit ?? 20;
  const skip = (page - 1) * safeLimit;
  if (props.body.search !== undefined && props.body.search.length < 2) {
    throw new HttpException("Search query must be at least 2 characters", 400);
  }
  if (props.body.search !== undefined && props.body.search.length > 100) {
    throw new HttpException("Search query must not exceed 100 characters", 400);
  }
  const whereClause: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.sectionId !== undefined && {
      section: { id: props.body.sectionId },
    }),
    ...(props.body.tagId !== undefined && {
      articleTags: {
        some: {
          tag: { id: props.body.tagId },
        },
      },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.economic_political_board_articlesWhereInput;
  const orderByInput = (
    props.body.sort === "title"
      ? { title: props.body.sortOrder ?? ("asc" as const) }
      : props.body.sort === "author_id"
        ? { author: { id: props.body.sortOrder ?? ("asc" as const) } }
        : { created_at: props.body.sortOrder ?? ("desc" as const) }
  ) satisfies Prisma.economic_political_board_articlesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.economic_political_board_articles.findMany(
    {
      where: whereClause,
      orderBy: orderByInput,
      skip,
      take: safeLimit,
      ...EconomicPoliticalBoardArticleAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.economic_political_board_articles.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: safeLimit satisfies number,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  };
}
