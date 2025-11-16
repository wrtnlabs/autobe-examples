import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallArticlesShoppingMallArticleId(props: {
  customer: CustomerPayload;
  shoppingMallArticleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: { id: props.shoppingMallArticleId },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  if (article.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_articles.delete({
    where: { id: props.shoppingMallArticleId },
  });
}
