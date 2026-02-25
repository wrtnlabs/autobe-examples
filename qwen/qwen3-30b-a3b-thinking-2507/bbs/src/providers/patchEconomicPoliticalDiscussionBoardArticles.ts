import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardArticles(props: {
  body: IEconomicPoliticalDiscussionBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardArticle.ISummary> {
  const {
    page = 1,
    limit = 20,
    sort = "newest",
    search,
    tags = props.body?.tags || [],
  } = props.body || {};
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_discussion_board_articlesWhereInput =
    {
      deleted_at: null,
    };
  if (tags?.length) {
    whereInput.articleTags = {
      some: {
        tag: {
          name: { in: tags },
        },
      },
    };
    if (search) {
      whereInput.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }
    let orderByInput: Prisma.economic_political_discussion_board_articlesOrderByWithRelationInput;
    switch (sort) {
      case "newest":
        orderByInput = { created_at: "desc" };
        break;
      case "oldest":
        orderByInput = { created_at: "asc" };
        break;
      case "most_comments":
        orderByInput = { comments: { _count: "desc" } };
        break;
      default:
        orderByInput = { created_at: "desc" };
    }
    const data =
      await MyGlobal.prisma.economic_political_discussion_board_articles.findMany(
        {
          where: whereInput,
          skip,
          take: limit,
          orderBy: orderByInput,
          ...EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer.select(),
        },
      );
    const total =
      await MyGlobal.prisma.economic_political_discussion_board_articles.count({
        where: { ...whereInput, deleted_at: null },
      });
    return {
      data: await ArrayUtil.asyncMap(
        data,
        EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer.transform,
      ),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  return {
    data: [],
    pagination: {
      current: page,
      limit,
      records: 0,
      pages: 0,
    },
  };
}
