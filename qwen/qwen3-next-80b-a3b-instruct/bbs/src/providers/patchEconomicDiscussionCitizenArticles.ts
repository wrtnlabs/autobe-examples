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
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionArticleAtSummaryTransformer } from "../transformers/EconomicDiscussionArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionCitizenArticles(props: {
  citizen: CitizenPayload;
  body: IEconomicDiscussionArticle.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build dynamic where clause
  let whereInput: Prisma.economic_discussion_articlesWhereInput = {};
  // Initialize AND array
  const andConditions: any[] = [];
  // Fuzzy search on title and content fields
  const fuzzySearch: any[] = [];
  if (props.body.search_term) {
    fuzzySearch.push({
      title: { contains: props.body.search_term, mode: "insensitive" },
    });
    fuzzySearch.push({
      content: { contains: props.body.search_term, mode: "insensitive" },
    });
  }
  if (fuzzySearch.length > 0) {
    andConditions.push({ OR: fuzzySearch });
  }
  // Add section filter if provided
  if (props.body.section_id) {
    andConditions.push({ section_id: props.body.section_id });
  }
  // Build AND logic for tag filters - article must have ALL specified tags
  if (props.body.tag_filters && props.body.tag_filters.length > 0) {
    // Use the relation field 'tag' with 'name' property instead of foreign key 'tag_id'
    // The schema shows economic_discussion_article_tags has 'tag' relation to economic_discussion_article_tag_vocabularies
    const articleIds = (
      await MyGlobal.prisma.economic_discussion_article_tags.findMany({
        where: {
          tag: {
            name: { in: props.body.tag_filters },
          },
        },
        select: {
          economic_discussion_article_id: true,
        },
      })
    ).map((item) => item.economic_discussion_article_id);
    if (articleIds.length > 0) {
      andConditions.push({
        id: {
          in: articleIds,
        },
      });
    } else {
      // No articles match all tags - return empty result
      andConditions.push({ id: { in: [] } });
    }
  }
  // Assign AND array to whereInput
  if (andConditions.length > 0) {
    whereInput.AND = andConditions;
  }
  // Build orderByInput - sortable by created_at, default descending
  const orderByInput = (
    props.body.sort_order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.economic_discussion_articlesOrderByWithRelationInput;
  // Use the transformer's select() method to efficiently fetch only needed fields
  const select = EconomicDiscussionArticleAtSummaryTransformer.select();
  // Fetch data using transformer's select and transform
  const data = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...select,
  });
  // Count total records matching the criteria
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: whereInput,
  });
  // Apply transformer to convert Prisma results to API DTO format
  // This handles: field mapping (title→section, created_at→author), tag aggregation,
  // comment_count aggregation, and author summary conversion
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicDiscussionArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
