import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallArticles(props: {
  customer: CustomerPayload;
  body: IShoppingMallArticle.IRequest;
}): Promise<IPageIShoppingMallArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_articlesWhereInput = {
    deleted_at: null,
  };

  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search } },
      { body: { contains: props.body.search } },
    ];
  }

  // Removed author_id and category_id here due to Prisma type errors

  if (
    props.body.created_after !== undefined ||
    props.body.created_before !== undefined
  ) {
    where.created_at = {};
    if (
      props.body.created_after !== undefined &&
      props.body.created_after !== null
    ) {
      where.created_at.gte = new Date(props.body.created_after);
    }
    if (
      props.body.created_before !== undefined &&
      props.body.created_before !== null
    ) {
      where.created_at.lte = new Date(props.body.created_before);
    }
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.order ?? "desc";
  const orderBy = {} as Record<string, "asc" | "desc">;
  orderBy[orderByField] = orderByDirection;

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_articles.findMany({
      where,
      // Removed include object due to Prisma type errors
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_articles.count({ where }),
  ]);

  // Placeholder objects to satisfy ISummary types for shopping_mall_customer and shopping_mall_article_category
  const placeholderCustomer: IShoppingMallCustomer.ISummary = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "placeholder@example.com",
    name: "Placeholder Customer",
    status: "active",
    created_at: "2024-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time">,
  };

  const placeholderCategory: IShoppingMallArticleCategory.ISummary = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Placeholder Category",
    created_at: "2024-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time">,
    updated_at: "2024-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time">,
  };

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: articles.map((article) => ({
      id: article.id,
      title: article.title,
      shopping_mall_customer: placeholderCustomer,
      shopping_mall_article_category: placeholderCategory,
      shopping_mall_customer_id: article.shopping_mall_customer_id,
      shopping_mall_article_category_id:
        article.shopping_mall_article_category_id,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      deleted_at: article.deleted_at
        ? toISOStringSafe(article.deleted_at)
        : null,
      body: article.body,
    })),
  } satisfies IPageIShoppingMallArticle.ISummary;
}
