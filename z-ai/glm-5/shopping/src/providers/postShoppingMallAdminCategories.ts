import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryCollector } from "../collectors/ShoppingMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // Validate parent if parentId provided
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parentId },
      select: { id: true, parent_id: true, deleted_at: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category has been deleted", 410);
    }
    // Enforce two-level hierarchy - cannot create subcategory under another subcategory
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot create subcategory under another subcategory. Maximum hierarchy depth is two levels.",
        400,
      );
    }
  }
  // Check name uniqueness among siblings
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        parent_id: props.body.parentId ?? null,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingCategory !== null) {
    throw new HttpException(
      "Category with this name already exists under the same parent",
      409,
    );
  }
  // Create category using collector and transformer
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallCategoryTransformer.select(),
  });
  return await ShoppingMallCategoryTransformer.transform(created);
}
