import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallArticleCategoriesShoppingMallArticleCategoryId(props: {
  admin: AdminPayload;
  shoppingMallArticleCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_article_categories.findUnique({
      where: { id: props.shoppingMallArticleCategoryId },
    });

  if (!existing) {
    throw new HttpException("Shopping mall article category not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_article_categories.delete({
    where: { id: props.shoppingMallArticleCategoryId },
  });
}
