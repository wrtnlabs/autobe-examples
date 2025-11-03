import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IEPageSortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPageSortDirection";
import { IPageIPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";

export async function patchPoliticsBbsArticles(props: {
  body: IPoliticsBbsArticle.IRequest;
}): Promise<IPageIPoliticsBbsArticle.ISummary> {
  const {
    category_id,
    created_after,
    created_before,
    limit = 20,
    page = 1,
    order = "desc",
    sort = "created_at",
    search,
  } = props.body;

  // Validate page and limit parameters
  const validatedPage = Math.max(1, Number(page));
  const validatedLimit = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (validatedPage - 1) * validatedLimit;

  // Build where conditions with proper type safety
  const whereConditions: Record<string, unknown> = {
    // IMPORTANT: Only include deleted_at check if both API allows it AND it exists in schema
    // API allows null/undefined but field may not exist in schema - checking schema shows deleted_at exists
    deleted_at: null,
  };

  // Category filter - handle nullable API vs required Prisma field
  if (category_id !== undefined && category_id !== null) {
    whereConditions.politics_bbs_category_id = category_id;
  }

  // Date range filtering
  if (created_after !== undefined && created_after !== null) {
    whereConditions.created_at = {
      ...((whereConditions.created_at as Record<string, unknown>) || {}),
      gte: created_after,
    };
  }

  if (created_before !== undefined && created_before !== null) {
    whereConditions.created_at = {
      ...((whereConditions.created_at as Record<string, unknown>) || {}),
      lte: created_before,
    };
  }

  // Text search with PostgreSQL full-text search capabilities
  if (search !== undefined && search !== null && search.length >= 3) {
    // Use PostgreSQL trigram operators for optimal performance
    whereConditions.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  // Determine sort order direction
  const sortDirection = order === "asc" ? "asc" : "desc";

  // Execute queries in parallel for performance
  const [articles, total] = await Promise.all([
    MyGlobal.prisma.politics_bbs_articles.findMany({
      where: whereConditions,
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            sequence: true,
            primary: true,
            required: true,
            multiplicative: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy: {
        [sort as string]: sortDirection,
      },
      skip,
      take: validatedLimit,
    }),
    MyGlobal.prisma.politics_bbs_articles.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match API response structure
  const summaryArticles: IPoliticsBbsArticle.ISummary[] = articles.map(
    (article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      content: article.content,
      state: article.state,
      view_count: article.view_count as number & tags.Type<"int32">,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      category: {
        id: article.category.id as string & tags.Format<"uuid">,
        code: article.category.code,
        name: article.category.name,
        description: article.category.description,
        color: article.category.color,
        icon: article.category.icon,
        sequence: article.category.sequence as number & tags.Type<"int32">,
        primary: article.category.primary,
        required: article.category.required,
        multiplicative: article.category.multiplicative,
        created_at: toISOStringSafe(article.category.created_at),
        updated_at: article.category.updated_at
          ? toISOStringSafe(article.category.updated_at)
          : null,
        deleted_at: article.category.deleted_at
          ? toISOStringSafe(article.category.deleted_at)
          : null,
      },
    }),
  );

  // Calculate total pages
  const totalPages = Math.ceil(total / validatedLimit);

  return {
    pagination: {
      current: Number(validatedPage),
      limit: Number(validatedLimit),
      records: total,
      pages: totalPages,
    },
    data: summaryArticles,
  };
}
