import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function getShoppingMallShoppingMallArticlesShoppingMallArticleId(props: {
  shoppingMallArticleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallArticle> {
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: { id: props.shoppingMallArticleId },
    include: {
      category: { include: { parent: true } },
      customer: true,
    },
  });

  if (!article) {
    throw new HttpException("ShoppingMallArticle not found", 404);
  }

  const commentsCount =
    await MyGlobal.prisma.shopping_mall_article_comments.count({
      where: { shopping_mall_article_id: props.shoppingMallArticleId },
    });

  const likesCount = await MyGlobal.prisma.shopping_mall_article_comments.count(
    {
      where: { shopping_mall_article_id: props.shoppingMallArticleId },
    },
  );

  const parent = article.category.parent;

  return {
    shoppingMallArticleId: article.id,
    title: article.title,
    body: article.body,
    shoppingMallArticleCategory: {
      id: article.category.id,
      name: article.category.name,
      parent:
        article.category.parent_id && parent !== null
          ? {
              id: parent.id,
              name: parent.name,
              parent: null,
              created_at: toISOStringSafe(parent.created_at),
              updated_at: toISOStringSafe(parent.updated_at),
              deleted_at: parent.deleted_at
                ? toISOStringSafe(parent.deleted_at)
                : null,
            }
          : null,
      created_at: toISOStringSafe(article.category.created_at),
      updated_at: toISOStringSafe(article.category.updated_at),
      deleted_at: article.category.deleted_at
        ? toISOStringSafe(article.category.deleted_at)
        : null,
    },
    shoppingMallCustomer: {
      id: article.customer.id,
      email: article.customer.email,
      name: article.customer.name,
      status: "active",
      created_at: toISOStringSafe(article.customer.created_at),
      updated_at: article.customer.updated_at
        ? toISOStringSafe(article.customer.updated_at)
        : undefined,
    },
    createdAt: toISOStringSafe(article.created_at),
    updatedAt: toISOStringSafe(article.updated_at),
    commentsCount: commentsCount,
    likesCount: likesCount,
  };
}
