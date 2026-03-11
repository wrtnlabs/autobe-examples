import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
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

export async function patchEconomicPoliticalBoardArticles(props: {
  body: IEconomicPoliticalBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.sectionId && { section_id: props.body.sectionId }),
    ...(props.body.authorId && { author_id: props.body.authorId }),
    ...(props.body.query && {
      OR: [
        { title: { contains: props.body.query } },
        { content: { contains: props.body.query } },
      ],
    }),
    ...(props.body.tags &&
      props.body.tags.length > 0 && {
        articleTags: {
          some: {
            tag: {
              name: {
                in: props.body.tags,
              },
            },
          },
        },
      }),
  } satisfies Prisma.economic_political_board_articlesWhereInput;
  const orderByInput: Prisma.economic_political_board_articlesOrderByWithRelationInput[] =
    props.body.sortBy === "oldest"
      ? [{ created_at: "asc" as const }]
      : props.body.sortBy === "mostCommented"
        ? [{ comments: { _count: "desc" } }]
        : [{ created_at: "desc" as const }];
  const data = await MyGlobal.prisma.economic_political_board_articles.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EconomicPoliticalBoardArticleAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.economic_political_board_articles.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
