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

export async function postShoppingMallCustomerShoppingMallArticles(props: {
  customer: CustomerPayload;
  body: IShoppingMallArticle.ICreate;
}): Promise<IShoppingMallArticle> {
  const { customer, body } = props;

  const newArticleId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_articles.create({
    data: {
      id: newArticleId,
      title: body.title,
      body: body.body,
      shopping_mall_article_category_id: body.shoppingMallArticleCategoryCode,
      shopping_mall_customer_id: customer.id,
      created_at: now,
      updated_at: now,
    },
  });

  if (!created) {
    throw new HttpException("Failed to create article", 500);
  }

  return {
    shoppingMallArticleId: created.id,
    title: created.title,
    body: created.body,
    shoppingMallArticleCategory: {
      id: created.shopping_mall_article_category_id,
      name: "",
      parent: null,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    },
    shoppingMallCustomer: {
      id: created.shopping_mall_customer_id,
      email: "",
      name: "",
      status: "",
      created_at: "",
      updated_at: undefined,
    },
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    commentsCount: 0,
    likesCount: 0,
  };
}
