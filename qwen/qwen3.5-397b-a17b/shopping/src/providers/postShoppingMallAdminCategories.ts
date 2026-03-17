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
  // Validate one-level nesting constraint if creating a subcategory
  if (
    props.body.parent_category_id !== undefined &&
    props.body.parent_category_id !== null
  ) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parent_category_id },
      select: { id: true, parent_category_id: true },
    });
    if (!parent) {
      throw new HttpException("Parent category not found", 404);
    }
    // Parent must be a top-level category (cannot create subcategory under a subcategory)
    if (parent.parent_category_id !== null) {
      throw new HttpException(
        "Cannot create subcategory under a subcategory. Only one-level nesting is allowed.",
        400,
      );
    }
  }
  // Validate name uniqueness among siblings (categories with same parent)
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        parent_category_id: props.body.parent_category_id ?? null,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingCategory) {
    throw new HttpException(
      "A category with this name already exists at the same parent level",
      409,
    );
  }
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
      shoppingMallAdmins: { id: props.admin.id },
    }),
    ...ShoppingMallCategoryTransformer.select(),
  });
  return await ShoppingMallCategoryTransformer.transform(created);
}
