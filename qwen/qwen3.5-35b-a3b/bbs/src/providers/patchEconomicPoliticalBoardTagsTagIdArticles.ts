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
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardTagsTagIdArticles(props: {
  tagId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 50) {
    throw new HttpException("Page size must be between 1 and 50", 400);
  }
  const tag = await MyGlobal.prisma.economic_political_board_tags.findUnique({
    where: { id: props.tagId },
  });
  if (!tag) {
    throw new HttpException("Tag not found", 404);
  }
  const orderByInput = (
    props.body.sort === "title"
      ? { title: props.body.sortOrder ?? ("asc" as const) }
      : props.body.sort === "updated_at"
        ? { updated_at: props.body.sortOrder ?? ("asc" as const) }
        : props.body.sort === "author_id"
          ? { author_id: props.body.sortOrder ?? ("asc" as const) }
          : { created_at: "desc" as const }
  ) satisfies Prisma.economic_political_board_articlesOrderByWithRelationInput;
  const whereInput: Prisma.economic_political_board_articlesWhereInput = {
    id: {
      in: await MyGlobal.prisma.economic_political_board_article_tags
        .findMany({
          where: {
            tag_id: props.tagId,
            article: {
              deleted_at: null,
              author: {},
            },
          },
          select: { article_id: true },
        })
        .then((results) => results.map((r) => r.article_id)),
    },
    deleted_at: null,
    author: {},
    ...(props.body.sectionId && { section_id: props.body.sectionId }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { content: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.economic_political_board_articlesWhereInput;
  const total = await MyGlobal.prisma.economic_political_board_articles.count({
    where: whereInput,
  });
  const data = await MyGlobal.prisma.economic_political_board_articles.findMany(
    {
      where: whereInput,
      skip,
      take: safeLimit,
      orderBy: orderByInput,
      ...EconomicPoliticalBoardArticleAtSummaryTransformer.select(),
    },
  );
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      (
        record: Prisma.economic_political_board_articlesGetPayload<
          ReturnType<
            typeof EconomicPoliticalBoardArticleAtSummaryTransformer.select
          >
        >,
      ) => EconomicPoliticalBoardArticleAtSummaryTransformer.transform(record),
    ),
  } satisfies IPageIEconomicPoliticalBoardArticle.ISummary;
}
