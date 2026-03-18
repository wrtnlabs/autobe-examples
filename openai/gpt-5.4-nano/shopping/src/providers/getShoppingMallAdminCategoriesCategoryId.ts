import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategory> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: ShoppingMallCategoryTransformer.select().select,
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // Customer browseability is controlled by `visibility`.
  // Only return when visibility indicates it can be shown.
  if (category.visibility !== "active") {
    throw new HttpException("Category not found", 404);
  }
  return await ShoppingMallCategoryTransformer.transform(category);
}
