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

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Verify category exists and is not soft-deleted
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
  // Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingSibling =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: { not: props.categoryId },
          parent_category_id: category.parent_category_id,
          name: props.body.name,
          deleted_at: null,
        },
      });
    if (existingSibling !== null) {
      throw new HttpException(
        "Category name must be unique among sibling categories",
        400,
      );
    }
  }
  // Validate parent category change if parent_category_id is being updated
  if (props.body.parent_category_id !== undefined) {
    // If setting a new parent, verify it exists and is a top-level category
    if (props.body.parent_category_id !== null) {
      const newParent =
        await MyGlobal.prisma.shopping_mall_categories.findUnique({
          where: {
            id: props.body.parent_category_id,
            deleted_at: null,
          },
        });
      if (newParent === null) {
        throw new HttpException("Parent category does not exist", 400);
      }
      // Enforce one-level nesting: parent must be top-level (no parent itself)
      if (newParent.parent_category_id !== null) {
        throw new HttpException(
          "Cannot create subcategory under another subcategory. Only one level of nesting is allowed",
          400,
        );
      }
    }
  }
  // Perform the update
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: {
      id: props.categoryId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_category_id !== undefined && {
        parent_category_id: props.body.parent_category_id,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated category
  const updated =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
      },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(updated);
}
