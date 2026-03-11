import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSearch(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Extract pagination parameters with defaults and validation
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum 100
  const skip = (page - 1) * limit;
  // Build WHERE clause with comprehensive filtering
  const whereClause = {
    deleted_at: null, // Only non-deleted articles
    status: "published", // Only published articles (consistent with business rules)
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
    // Enhanced search with multiple matching strategies for better results
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          // Exact title match
          {
            title: { equals: props.body.search, mode: "insensitive" as const },
          },
          // Contains in title (most common)
          {
            title: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          // Contains in body
          {
            body: { contains: props.body.search, mode: "insensitive" as const },
          },
          // Remove word boundary search as it's not supported by Prisma StringFilter
        ],
      }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Determine ordering based on search criteria
  const orderBy =
    props.body.search && props.body.search.trim() !== ""
      ? [
          // Primary: title exact match
          {
            title: "desc" as const,
          },
          // Secondary: recency
          {
            created_at: "desc" as const,
          },
        ]
      : {
          created_at: "desc" as const, // Default: most recent first
        };
  // Execute count query for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereClause,
  });
  // Fetch paginated data with optimized transformer selection
  const articleData = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Transform database results to DTO format
  const data = await ArrayUtil.asyncMap(
    articleData,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Construct pagination response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
