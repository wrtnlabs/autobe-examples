import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPoliticalDiscussionArticles(props: {
  body: IEconPoliticalDiscussionArticle.IRequest;
}): Promise<IPageIEconPoliticalDiscussionArticle.ISummary> {
  const {
    page,
    limit,
    search,
    category,
    author_id,
    status,
    order_by,
    order_direction,
    has_attachments,
  } = props.body;

  const currentPage = page ?? 1;
  const pageLimit = limit ?? 20;
  const skip = (currentPage - 1) * pageLimit;

  // Build dynamic where conditions
  const whereConditions: Record<string, unknown> = {
    deleted_at: null, // Exclude soft deleted articles
  };

  // Text search across title and content
  if (search) {
    whereConditions.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  // Category filtering
  if (category) {
    whereConditions.category = { contains: category, mode: "insensitive" };
  }

  // Author filtering
  if (author_id) {
    whereConditions.econ_political_discussion_user_id = author_id;
  }

  // Status filtering
  if (status) {
    whereConditions.status = { equals: status };
  }

  // Attachment filtering - check if article has any attachments
  if (has_attachments) {
    whereConditions.econ_political_discussion_attachments = {
      some: {},
    };
  }

  // Sorting configuration with validation
  const orderByField = order_by ?? "created_at";
  const sortOrder = order_direction === "asc" ? "asc" : "desc";

  const orderBy: Prisma.econ_political_discussion_articlesOrderByWithRelationInput =
    {
      [orderByField]: sortOrder,
    };

  // Execute parallel queries for data and count
  const [articles, totalCount] = await Promise.all([
    MyGlobal.prisma.econ_political_discussion_articles.findMany({
      where: whereConditions,
      skip,
      take: pageLimit,
      orderBy,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_political_discussion_articles.count({
      where: whereConditions,
    }),
  ]);

  // Transform database results to API format with proper date conversion
  const data = articles.map((article) => ({
    id: article.id,
    title: article.title,
    category: article.category,
    status: article.status,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / pageLimit);
  const pagination: IPage.IPagination = {
    current: currentPage,
    limit: pageLimit,
    records: totalCount,
    pages: totalPages,
  };

  return {
    data,
    pagination,
  };
}
