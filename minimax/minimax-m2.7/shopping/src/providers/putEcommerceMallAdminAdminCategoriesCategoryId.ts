import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // 1. Find and validate category exists and is not soft-deleted
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
    });
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // 2. Validate name uniqueness within parent scope if name is being changed
  if (props.body.name !== undefined && props.body.name !== category.name) {
    const existingName =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          parent_id: category.parent_id,
          name: props.body.name,
          deleted_at: null,
        },
      });
    if (existingName) {
      throw new HttpException(
        "Category name already exists under this parent",
        400,
      );
    }
  }
  // 3. Validate parent_id changes
  if (
    props.body.parentId !== undefined &&
    props.body.parentId !== category.parent_id
  ) {
    // Subcategories cannot have their parent changed (enforce max one-level nesting)
    if (category.parent_id !== null) {
      throw new HttpException("Cannot change parent of a subcategory", 400);
    }
    // If setting to a new parent (not null)
    if (props.body.parentId !== null) {
      // Validate new parent exists and is not soft-deleted
      const parentCategory =
        await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
          where: { id: props.body.parentId },
        });
      if (!parentCategory || parentCategory.deleted_at !== null) {
        throw new HttpException("Parent category not found", 404);
      }
      // New parent must be a top-level category (cannot be a subcategory)
      if (parentCategory.parent_id !== null) {
        throw new HttpException("Cannot set a subcategory as parent", 400);
      }
      // Cannot set self as parent
      if (props.body.parentId === props.categoryId) {
        throw new HttpException("Category cannot be its own parent", 400);
      }
    }
  }
  // 4. Build dynamic update data with only provided fields
  const data: Prisma.ecommerce_mall_categoriesUpdateInput = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parentId !== undefined && {
      parent:
        props.body.parentId === null
          ? { disconnect: true }
          : { connect: { id: props.body.parentId } },
    }),
  };
  // 5. Perform the update
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data,
  });
  // 6. Fetch updated category with full relations for response
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  // 7. Transform and return
  return await EcommerceMallCategoryTransformer.transform(updated);
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallAdminAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCategory.IUpdate;
// }): Promise<IEcommerceMallCategory> {
//   await MyGlobal.prisma.ecommerce_mall_categories.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCategoryTransformer.select(),
//   });
//   return await EcommerceMallCategoryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------