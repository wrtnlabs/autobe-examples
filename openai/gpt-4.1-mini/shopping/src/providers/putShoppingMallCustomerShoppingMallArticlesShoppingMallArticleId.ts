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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingMallArticlesShoppingMallArticleId(props: {
  customer: CustomerPayload;
  shoppingMallArticleId: string & tags.Format<"uuid">;
  body: IShoppingMallArticle.IUpdate;
}): Promise<IShoppingMallArticle> {
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: { id: props.shoppingMallArticleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: cannot edit another customer's article",
      403,
    );
  }

  if (props.body.title) {
    const existingTitleArticle =
      await MyGlobal.prisma.shopping_mall_articles.findFirst({
        where: {
          shopping_mall_customer_id: props.customer.id,
          title: props.body.title,
          id: { not: props.shoppingMallArticleId },
        },
        select: { id: true },
      });

    if (existingTitleArticle) {
      throw new HttpException("Duplicate title for this customer", 400);
    }
  }

  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const updated = await MyGlobal.prisma.shopping_mall_articles.update({
    where: { id: props.shoppingMallArticleId },
    data: {
      title: props.body.title ?? undefined,
      body: props.body.body ?? undefined,
      shopping_mall_article_category_id:
        props.body.shoppingMallArticleCategoryId ?? undefined,
      updated_at: updatedAt,
    },
  });

  const category =
    await MyGlobal.prisma.shopping_mall_article_categories.findUnique({
      where: { id: updated.shopping_mall_article_category_id },
    });

  if (!category) {
    throw new HttpException("Article category not found", 500);
  }

  const parentCategory = category.parent_id
    ? await MyGlobal.prisma.shopping_mall_article_categories.findUnique({
        where: { id: category.parent_id },
      })
    : null;

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: updated.shopping_mall_customer_id },
  });

  if (!customer) {
    throw new HttpException("Article customer not found", 500);
  }

  const parentSummary:
    | IShoppingMallArticleCategory.ISummary
    | null
    | undefined = parentCategory
    ? {
        id: parentCategory.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        name: parentCategory.name,
        parent:
          parentCategory.parent_id === null ||
          parentCategory.parent_id === undefined
            ? undefined
            : null,
        created_at: toISOStringSafe(parentCategory.created_at),
        updated_at: toISOStringSafe(parentCategory.updated_at),
        deleted_at:
          parentCategory.deleted_at !== null &&
          parentCategory.deleted_at !== undefined
            ? toISOStringSafe(parentCategory.deleted_at)
            : null,
      }
    : null;

  // 'status' is required but missing in customer DB schema, set default "active"
  const customerStatus = "active";

  return {
    shoppingMallArticleId: updated.id satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">,
    title: updated.title,
    body: updated.body,
    shoppingMallArticleCategory: {
      id: category.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      name: category.name,
      parent: parentSummary,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
      deleted_at:
        category.deleted_at !== null && category.deleted_at !== undefined
          ? toISOStringSafe(category.deleted_at)
          : null,
    },
    shoppingMallCustomer: {
      id: customer.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      email: customer.email,
      name: customer.name,
      status: customerStatus,
      created_at: toISOStringSafe(customer.created_at),
      updated_at:
        customer.updated_at !== null && customer.updated_at !== undefined
          ? toISOStringSafe(customer.updated_at)
          : undefined,
    },
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    commentsCount: 0,
    likesCount: 0,
  };
}
