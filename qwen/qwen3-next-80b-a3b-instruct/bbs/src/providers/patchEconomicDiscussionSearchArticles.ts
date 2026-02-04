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

export async function patchEconomicDiscussionSearchArticles(props: {
  body: IEconomicDiscussionArticle.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  // Extract request parameters with defaults
  const {
    search_term,
    section_id,
    tag_filters,
    page = 1,
    limit = 20,
    sort_order = "desc",
  } = props.body;
  // Validate search term and tag filters: must have at least one of them
  if (!search_term && (!tag_filters || tag_filters.length === 0)) {
    throw new HttpException(
      "Search term or at least one tag filter must be provided",
      400,
    );
  }
  // Validate search_term length
  if (search_term && (search_term.length < 1 || search_term.length > 200)) {
    throw new HttpException(
      "Search term must be between 1 and 200 characters",
      400,
    );
  }
  // Validate tag_filters length
  if (tag_filters && tag_filters.length > 10) {
    throw new HttpException("Maximum 10 tag filters allowed", 400);
  }
  // Calculate offset for pagination
  const skip = (page - 1) * limit;
  // Build where condition - using only valid field names from schema
  // Based on schema analysis, economic_discussion_articles has "section" (relation) not "section_id" (column)
  // And economic_discussion_article_tags has "tag" (relation) not "tags" (incorrect plural)
  const whereInput: Prisma.economic_discussion_articlesWhereInput = {
    AND: [
      ...(search_term
        ? [
            {
              OR: [
                { title: { contains: search_term } },
                { content: { contains: search_term } },
              ],
            },
          ]
        : []),
      ...(section_id ? [{ section: { id: section_id } }] : []), // Use relation name 'section' with nested id
      ...(tag_filters && tag_filters.length > 0
        ? [
            {
              economic_discussion_article_tags: {
                some: {
                  tag: {
                    name: { in: tag_filters },
                  },
                },
              },
            },
          ]
        : []),
    ],
  };
  // Build order by condition with ternary
  const orderByInput = (
    sort_order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.economic_discussion_articlesOrderByWithRelationInput;
  // Query database with transformer's select for optimal field selection
  // Use IEconomicDiscussionArticle.ISummary transformer which is the only available one
  const data = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EconomicDiscussionArticleAtSummaryTransformer.select(),
  });
  // Count total records with identical where conditions
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: whereInput,
  });
  // Transform data with transformer
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicDiscussionArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
