import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminCategoriesCategoryId(props: {
  superAdmin: SuperadminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // 1. Find the category to update
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: {
      id: true,
      parent_id: true,
      name: true,
      deleted_at: true,
    },
  });
  if (!category || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // 2. Validate name uniqueness if name is being changed
  if (props.body.name !== undefined) {
    const newParentId =
      props.body.parentId !== undefined
        ? props.body.parentId
        : category.parent_id;
    const existingWithName =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          name: props.body.name,
          parent_id: newParentId,
          deleted_at: null,
          NOT: { id: props.categoryId },
        },
      });
    if (existingWithName) {
      throw new HttpException(
        "Category name already exists within this parent scope",
        409,
      );
    }
  }
  // 3. Validate parent_id if being changed
  if (
    props.body.parentId !== undefined &&
    props.body.parentId !== category.parent_id
  ) {
    // Subcategories cannot have their parent changed
    if (category.parent_id !== null) {
      throw new HttpException("Cannot change parent of a subcategory", 400);
    }
    // Cannot set parent to self
    if (props.body.parentId === props.categoryId) {
      throw new HttpException("Category cannot be its own parent", 400);
    }
    // If setting to a non-null parent, validate it exists and is a top-level category
    if (props.body.parentId !== null) {
      const newParent =
        await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
          where: { id: props.body.parentId },
          select: {
            id: true,
            parent_id: true,
            deleted_at: true,
          },
        });
      if (!newParent || newParent.deleted_at !== null) {
        throw new HttpException("Parent category not found", 404);
      }
      // New parent must be a top-level category (cannot be a subcategory)
      if (newParent.parent_id !== null) {
        throw new HttpException(
          "Cannot set a subcategory as parent (max one-level nesting)",
          400,
        );
      }
      // Check if the new parent is a descendant of the category being updated
      const isDescendant = await checkIsDescendant(
        props.body.parentId,
        props.categoryId,
      );
      if (isDescendant) {
        throw new HttpException(
          "Cannot set a descendant category as parent (circular reference)",
          400,
        );
      }
    }
  }
  // 4. Build update data - use string date for updated_at
  const updateData: {
    name?: string;
    description?: string | null;
    parent_id?: string | null;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.parentId !== undefined) {
    updateData.parent_id = props.body.parentId;
  }
  // 5. Update the category
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // 6. Fetch updated category with transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  return await EcommerceMallCategoryTransformer.transform(updated);
}
/**
 * Recursively checks if potentialDescendantId is a descendant of ancestorId
 */
async function checkIsDescendant(
  potentialDescendantId: string & tags.Format<"uuid">,
  ancestorId: string & tags.Format<"uuid">,
): Promise<boolean> {
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: potentialDescendantId },
    select: {
      id: true,
      parent_id: true,
    },
  });
  if (!category) {
    return false;
  }
  if (category.parent_id === null) {
    return false;
  }
  if (category.parent_id === ancestorId) {
    return true;
  }
  const parentCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: category.parent_id },
      select: {
        id: true,
        parent_id: true,
      },
    });
  if (!parentCategory) {
    return false;
  }
  if (parentCategory.parent_id === ancestorId) {
    return true;
  }
  return checkIsDescendant(
    parentCategory.parent_id as string & tags.Format<"uuid">,
    ancestorId,
  );
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
// export async function putEcommerceMallSuperAdminAdminCategoriesCategoryId(props: {
//   superAdmin: SuperadminPayload;
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