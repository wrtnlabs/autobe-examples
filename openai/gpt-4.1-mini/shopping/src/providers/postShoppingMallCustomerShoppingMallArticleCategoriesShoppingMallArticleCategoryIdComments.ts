import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallArticleCategoriesShoppingMallArticleCategoryIdComments(props: {
  customer: CustomerPayload;
  shoppingMallArticleCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallArticleComment.ICreate;
}): Promise<IShoppingMallArticleComment> {
  const created = await MyGlobal.prisma.shopping_mall_article_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_article_category_id: props.shoppingMallArticleCategoryId,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_customer_session_id: undefined,
      body: props.body.content,
      created_at: toISOStringSafe(new Date()),
      updated_at: undefined,
    },
  });

  return {
    id: created.id,
    shopping_mall_article_category_id: props.shoppingMallArticleCategoryId,
    content: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at:
      created.updated_at === null ? null : toISOStringSafe(created.updated_at),
  };
}
