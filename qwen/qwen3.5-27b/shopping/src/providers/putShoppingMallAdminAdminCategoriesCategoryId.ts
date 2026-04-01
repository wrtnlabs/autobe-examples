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
  // Find the category to update (must exist and not be soft-deleted)
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, parent_id: true },
    });
  // Validate parent_id if provided and not null
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    // Check that the parent category exists and is a top-level category (parent_id = null)
    const parentCategory =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
          parent_id: null, // Must be top-level to enforce one-level nesting rule
        },
        select: { id: true },
      });
    if (parentCategory === null) {
      throw new HttpException(
        "Parent category must be a top-level category",
        400,
      );
    }
  }
  // Update the category with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
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
    ...ShoppingMallCategoryTransformer.select(),
  });
  // Transform and return the updated category
  return await ShoppingMallCategoryTransformer.transform(updated);
}
