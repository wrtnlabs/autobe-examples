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

export async function patchPoliticsBbsSearchArticles(props: {
  body: IPoliticsBbsArticle.IRequest;
}): Promise<IPageIPoliticsBbsArticle.ISummary> {
  const body = props.body;

  // Pagination with validation bounds
  const page = Number(body.page ?? 1) as number satisfies number;
  const limit = Number(body.limit ?? 20) as number satisfies number;
  const skip = (page - 1) * limit;

  // Build where conditions dynamically
  const where = {
    deleted_at: null,
    ...(body.category_id !== undefined &&
      body.category_id !== null && {
        politics_bbs_category_id: body.category_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { title: { contains: body.search } },
          { content: { contains: body.search } },
        ],
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
  } satisfies Prisma.politics_bbs_articlesWhereInput;

  // Determine sorting
  const orderBy = {
    [body.sort === "view_count" ? "view_count" : "created_at"]:
      body.order === "asc" ? "asc" : "desc",
  } satisfies Prisma.politics_bbs_articlesOrderByWithRelationInput;

  // Execute query with pagination
  const [articles, total] = await Promise.all([
    MyGlobal.prisma.politics_bbs_articles.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        state: true,
        view_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        politics_bbs_category_id: true,
        category: {
          select: {
            id: true,
            code: true,
            name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            sequence: true,
            primary: true,
            required: true,
            multiplicative: true,
            color: true,
            icon: true,
            description: true,
          },
        },
      },
    }),
    MyGlobal.prisma.politics_bbs_articles.count({ where }),
  ]);

  // Transform results to proper API structure
  const transformedArticles = articles.map(
    (article) =>
      ({
        id: article.id,
        title: article.title,
        content: article.content,
        state: article.state,
        view_count: article.view_count,
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        category: {
          id: article.category.id,
          code: article.category.code,
          name: article.category.name,
          created_at: toISOStringSafe(article.category.created_at),
          updated_at: toISOStringSafe(article.category.updated_at),
          deleted_at: article.category.deleted_at
            ? toISOStringSafe(article.category.deleted_at)
            : null,
          sequence: article.category.sequence,
          primary: article.category.primary,
          required: article.category.required,
          multiplicative: article.category.multiplicative,
          color: article.category.color,
          icon: article.category.icon,
          description: article.category.description,
        },
      }) satisfies IPoliticsBbsArticle.ISummary,
  );

  // Return properly paginated results
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedArticles,
  } satisfies IPageIPoliticsBbsArticle.ISummary;
}
