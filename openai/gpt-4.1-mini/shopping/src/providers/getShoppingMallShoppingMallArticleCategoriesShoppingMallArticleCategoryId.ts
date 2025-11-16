import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

export async function getShoppingMallShoppingMallArticleCategoriesShoppingMallArticleCategoryId(props: {
  shoppingMallArticleCategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallArticleCategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_article_categories.findUnique({
      where: { id: props.shoppingMallArticleCategoryId },
    });

  if (!category) {
    throw new HttpException("Shopping mall article category not found", 404);
  }

  return {
    id: category.id,
    name: category.name,
    description:
      category.description === null
        ? null
        : (category.description ?? undefined),
    parent_id:
      category.parent_id === null ? null : (category.parent_id ?? undefined),
    created_at: toISOStringSafe(category.created_at),
    updated_at:
      category.updated_at === null
        ? null
        : category.updated_at === undefined
          ? undefined
          : toISOStringSafe(category.updated_at),
  };
}
