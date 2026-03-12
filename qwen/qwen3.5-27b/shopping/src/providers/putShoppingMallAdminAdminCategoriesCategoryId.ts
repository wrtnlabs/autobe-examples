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

export async function putShoppingMallAdminAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Find the category to update (throws 404 if not found or soft-deleted)
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  // Validate parent_id if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    // Check if the new parent exists and is a top-level category
    const newParent = await MyGlobal.prisma.shopping_mall_categories.findUnique(
      {
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
        select: {
          parent_id: true,
        },
      },
    );
    if (newParent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    // Enforce one-level nesting: parent must be top-level (parent_id = null)
    if (newParent.parent_id !== null) {
      throw new HttpException(
        "Parent category must be a top-level category",
        400,
      );
    }
    // Prevent self-reference
    if (props.body.parent_id === props.categoryId) {
      throw new HttpException("Category cannot be its own parent", 400);
    }
  }
  // Update the category with provided fields
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_id !== undefined && {
        parent_id: props.body.parent_id,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated category with full relations for response
  const result =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(result);
}
