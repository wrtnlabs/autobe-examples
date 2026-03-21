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
  // Step 1: Find the existing category
  const existingCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Step 2: Validate category is not soft-deleted
  if (existingCategory.deleted_at !== null) {
    throw new HttpException("Category not found or already deleted", 404);
  }
  // Step 3: Validate name uniqueness within same parent scope (excluding current record)
  if (props.body.name !== undefined) {
    const duplicateName =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          parent_id: existingCategory.parent_id,
          name: props.body.name,
          deleted_at: null,
          id: { not: props.categoryId },
        },
      });
    if (duplicateName !== null) {
      throw new HttpException(
        "Category name already exists within the same parent scope",
        400,
      );
    }
  }
  // Step 4: Validate parentId if provided
  if (props.body.parentId !== undefined) {
    const targetParentId = props.body.parentId;
    if (targetParentId !== null) {
      // Validate parent exists and is not soft-deleted
      const parentCategory =
        await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
          where: {
            id: targetParentId,
            deleted_at: null,
          },
        });
      if (parentCategory === null) {
        throw new HttpException(
          "Parent category not found or has been deleted",
          400,
        );
      }
      // Enforce one-level nesting limit: parent cannot be a subcategory itself
      if (parentCategory.parent_id !== null) {
        throw new HttpException(
          "Cannot assign a subcategory as parent. Only top-level categories can have subcategories",
          400,
        );
      }
      // Prevent circular references: recursively check if targetParentId is a descendant
      const isDescendant = await checkIsDescendant(
        props.categoryId,
        targetParentId,
      );
      if (isDescendant) {
        throw new HttpException(
          "Cannot set a descendant category as parent (circular reference)",
          400,
        );
      }
    }
  }
  // Step 5: Update the category within a transaction
  const updatedCategory = await MyGlobal.prisma.$transaction(async (tx) => {
    const updateData = {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parentId !== undefined && {
        parent_id: props.body.parentId,
      }),
      updated_at: new Date(),
    };
    await tx.ecommerce_mall_categories.update({
      where: { id: props.categoryId },
      data: updateData,
    });
    return await tx.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  });
  // Step 6: Transform and return
  return await EcommerceMallCategoryTransformer.transform(updatedCategory);
}
/**
 * Helper function to recursively check if a category is a descendant of another
 */
async function checkIsDescendant(
  ancestorId: string & tags.Format<"uuid">,
  potentialDescendantId: string & tags.Format<"uuid">,
): Promise<boolean> {
  // Check direct children first
  const directChild = await MyGlobal.prisma.ecommerce_mall_categories.findFirst(
    {
      where: {
        parent_id: ancestorId,
        id: potentialDescendantId,
        deleted_at: null,
      },
    },
  );
  if (directChild !== null) {
    return true;
  }
  // Get all direct children of ancestor
  const directChildren =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: {
        parent_id: ancestorId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Recursively check each child
  for (const child of directChildren) {
    const childId = child.id;
    const isDescendant = await checkIsDescendant(
      childId,
      potentialDescendantId,
    );
    if (isDescendant) {
      return true;
    }
  }
  return false;
}
