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
  // Validate parent_id if provided - check existence, not deleted, and one-level nesting
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parentCategory =
      await MyGlobal.prisma.shopping_mall_categories.findUnique({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_id: true,
        },
      });
    if (parentCategory === null) {
      throw new HttpException("Parent category not found", 400);
    }
    // Enforce one-level nesting: parent must be a top-level category (parent_id is null)
    if (parentCategory.parent_id !== null) {
      throw new HttpException(
        "Cannot create subcategory of a subcategory - only one level of nesting is allowed",
        400,
      );
    }
  }
  // Check unique constraint: same name not allowed under same parent
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        parent_id: props.body.parent_id ?? null,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingCategory !== null) {
    throw new HttpException(
      "Category with this name already exists under the same parent",
      409,
    );
  }
  // Create the category using the collector
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallCategoryTransformer.select(),
  });
  return await ShoppingMallCategoryTransformer.transform(created);
}
