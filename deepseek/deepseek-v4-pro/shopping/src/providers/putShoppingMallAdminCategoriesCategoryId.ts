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
  // 1. Validate category existence (not soft-deleted)
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId, deleted_at: null },
      select: { id: true, name: true, parent_id: true },
    });
  // 2. Name validation: must be non-empty when provided
  if (props.body.name !== undefined && props.body.name.trim().length === 0) {
    throw new HttpException("Category name cannot be empty", 400);
  }
  // 3. Parent validation (if parentId is provided and non-null)
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parentId, deleted_at: null },
      select: { id: true, parent_id: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Parent category must be a top-level category",
        400,
      );
    }
    if (parent.id === props.categoryId) {
      throw new HttpException("Category cannot be its own parent", 400);
    }
  }
  // 4. Name uniqueness within parent scope (if name changed)
  if (props.body.name !== undefined && props.body.name !== category.name) {
    const effectiveParentId =
      props.body.parentId !== undefined
        ? props.body.parentId
        : category.parent_id;
    const existing = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.categoryId },
        deleted_at: null,
        parent_id: effectiveParentId === null ? null : effectiveParentId,
      },
    });
    if (existing !== null) {
      throw new HttpException(
        "Category name already exists in this scope",
        409,
      );
    }
  }
  // 5. Update — apply only provided fields
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parentId !== undefined && {
        parent_id: props.body.parentId,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  // 6. Return updated category with full transformer response
  const updated =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IShoppingMallCategory.IUpdate;
// }): Promise<IShoppingMallCategory> {
//   await MyGlobal.prisma.shopping_mall_categories.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCategoryTransformer.select(),
//   });
//   return await ShoppingMallCategoryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------