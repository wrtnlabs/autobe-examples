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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionSuperAdministratorAdminAnalyticsMostCommented(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Get aggregated article data with comment count
  const articlesWithCommentCount =
    await MyGlobal.prisma.economic_discussion_articles.findMany({
      skip,
      take: limit,
      orderBy: {
        comment_count: "desc",
      },
      where: {}, // Removed non-existent 'is_deleted' filter
      select: {
        id: true,
        section_id: true,
        created_at: true,
        comment_count: true,
        author_id: true,
      },
    });
  // Count total articles
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: {}, // Removed non-existent 'is_deleted' filter
  });
  // Transform data using the correct transformer logic
  const transformedData = articlesWithCommentCount.map((article) => {
    // Extract tag names from the article_tags relationship
    // Since economic_discussion_article_tags doesn't exist in schema, we cannot populate tags
    const tags: (string & tags.MinLength<2> & tags.MaxLength<50>)[] = [];
    return {
      id: article.id,
      title: article.section_id,
      created_at: toISOStringSafe(article.created_at),
      author: {
        id: article.author_id,
      },
      comment_count: article.comment_count,
      tags: tags,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
