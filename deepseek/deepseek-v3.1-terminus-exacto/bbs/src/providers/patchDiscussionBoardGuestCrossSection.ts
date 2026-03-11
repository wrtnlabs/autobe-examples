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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardGuestCrossSection(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build base WHERE clause for article filtering
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    // Only published articles visible to guests
    status: "published",
    // Not soft-deleted
    deleted_at: null,
  };
  // Add section filtering if specified
  if (props.body.discussion_board_section_id) {
    whereInput.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }
  // Add full-text search if specified - using PostgreSQL trigram similarity
  // The table has gin_trgm_ops indexes on title and body fields
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerm = props.body.search.trim();
    // Use similarity search with trigram matching
    whereInput.OR = [
      {
        title: {
          // Use contains for basic search, could be enhanced with raw SQL for similarity
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
      {
        body: {
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
    ];
  }
  // Note: Tag filtering would require additional JOIN to discussion_board_article_tags
  // but the specification mentions filtering by tags. This could be implemented with
  // a JOIN if tag IDs were provided in the request body.
  // Fetch articles with pagination
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    // Sort by newest first (could be enhanced with relevance scoring when searching)
    orderBy: { created_at: "desc" as const },
    // Use transformer's select pattern which includes author, section, tags, etc.
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform article data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
