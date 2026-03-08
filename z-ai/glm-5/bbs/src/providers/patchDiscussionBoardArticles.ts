import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  // Keyword search on title and content (case-insensitive)
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    whereInput.OR = [
      { title: { contains: body.search, mode: "insensitive" } },
      { content: { contains: body.search, mode: "insensitive" } },
    ];
  }
  // Section filter (OR logic for multiple sections)
  if (
    body.sectionIds !== undefined &&
    body.sectionIds !== null &&
    body.sectionIds.length > 0
  ) {
    whereInput.section_id = { in: body.sectionIds };
  }
  // Tag filter via junction table
  if (
    body.tagIds !== undefined &&
    body.tagIds !== null &&
    body.tagIds.length > 0
  ) {
    whereInput.articleTags = {
      some: {
        discussion_board_tag_id: { in: body.tagIds },
      },
    };
  }
  // Author filter
  if (body.memberId !== undefined && body.memberId !== null) {
    whereInput.member_id = body.memberId;
  }
  // Date range filter - build filter object separately to avoid type narrowing issues
  const dateFilter: Prisma.DateTimeFilter<"discussion_board_articles"> = {};
  if (body.createdFrom !== undefined && body.createdFrom !== null) {
    dateFilter.gte = new Date(body.createdFrom);
  }
  if (body.createdTo !== undefined && body.createdTo !== null) {
    dateFilter.lte = new Date(body.createdTo);
  }
  if (dateFilter.gte !== undefined || dateFilter.lte !== undefined) {
    whereInput.created_at = dateFilter;
  }
  // Parse and validate sort parameter
  const sortParts = (body.sort ?? "created_at:desc").split(":");
  const sortField = sortParts[0] ?? "created_at";
  const sortDirection = (sortParts[1] ?? "desc") as "asc" | "desc";
  const validSortFields = ["created_at", "updated_at", "title"];
  const validSortField = validSortFields.includes(sortField)
    ? sortField
    : "created_at";
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    validSortField === "title"
      ? { title: sortDirection }
      : validSortField === "updated_at"
        ? { updated_at: sortDirection }
        : { created_at: sortDirection };
  // Query articles with pagination
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    articles,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
