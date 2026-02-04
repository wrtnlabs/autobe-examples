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
import { EconomicDiscussionArticleAtSummaryTransformer } from "../transformers/EconomicDiscussionArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionSectionsSectionIdArticles(props: {
  sectionId: string & tags.Format<"uuid">;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: {
      section_id: props.sectionId,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      title: true,
      created_at: true,
      author: {
        select: {
          id: true,
          email: true,
          password_hash: true,
          display_name: true,
          bio: true,
          created_at: true,
          updated_at: true,
        },
      },
      _count: {
        select: {
          economic_discussion_comments: true,
        },
      },
      economic_discussion_article_tags: {
        select: {
          tag_id: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: {
      section_id: props.sectionId,
    },
  });
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
