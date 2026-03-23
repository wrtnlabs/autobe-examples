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
  // Validate parent_id if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    // Check if parent exists and is not deleted
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    if (parent === null) {
      throw new HttpException(
        "Parent category does not exist or is deleted",
        400,
      );
    }
    // Enforce one-level nesting: parent must be top-level (parent_id is null)
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Parent category must be a top-level category",
        400,
      );
    }
  }
  // Check unique constraint: no existing category with same parent_id and name
  const existing = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      parent_id: props.body.parent_id ?? null,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Category with this name already exists under this parent",
      409,
    );
  }
  // Create the category using collector
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallCategoryTransformer.select(),
  });
  // Transform and return the created category
  return await ShoppingMallCategoryTransformer.transform(created);
}
