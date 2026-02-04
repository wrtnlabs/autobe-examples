import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicDiscussionArticleAtSummaryTransformer } from "../transformers/EconomicDiscussionArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionAdministratorAdminAnalyticsMostCommented(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_discussion_articles.findMany({
    orderBy: {
      comments: {
        _count: "desc",
      },
    },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      created_at: true,
      author: { select: { id: true } },
      _count: {
        select: {
          comments: true,
        },
      },
      article_tags: {
        select: {
          article_tag_vocabularies: {
            select: { name: true },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.economic_discussion_articles.count();
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicDiscussionArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
