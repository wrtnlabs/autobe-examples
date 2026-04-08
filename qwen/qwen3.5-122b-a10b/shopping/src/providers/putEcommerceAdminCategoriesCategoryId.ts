import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCategoryTransformer } from "../transformers/EcommerceCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceCategory.IUpdate;
}): Promise<IEcommerceCategory> {
  // 1. Verify category exists and is not soft-deleted
  const category = await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow(
    {
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        deleted_at: true,
      },
    },
  );
  // 2. Validate parent_id if being changed
  if (props.body.parent_id !== undefined) {
    const newParentId = props.body.parent_id;
    // 2a. Prevent setting category as its own parent
    if (newParentId !== null && newParentId === props.categoryId) {
      throw new HttpException("Cannot set category as its own parent", 400);
    }
    // 2b. Validate new parent exists and is not soft-deleted (only if setting a parent, not removing)
    if (newParentId !== null) {
      const newParent = await MyGlobal.prisma.ecommerce_categories.findFirst({
        where: {
          id: newParentId,
          deleted_at: null,
        },
        select: { id: true, parent_id: true },
      });
      if (newParent === null) {
        throw new HttpException(
          "Parent category not found or has been deleted",
          400,
        );
      }
      // 2c. Validate one-level nesting: parent cannot have its own parent
      if (newParent.parent_id !== null) {
        throw new HttpException(
          "Cannot set a subcategory as parent (one-level nesting only)",
          400,
        );
      }
    }
  }
  // 3. Validate name uniqueness within parent level if being changed
  if (props.body.name !== undefined) {
    const newName = props.body.name;
    const currentParentId = category.parent_id;
    const newParentId = props.body.parent_id ?? currentParentId;
    // Check for duplicate name within the same parent level
    const duplicate = await MyGlobal.prisma.ecommerce_categories.findFirst({
      where: {
        id: { not: props.categoryId },
        parent_id: newParentId,
        name: newName,
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    if (duplicate !== null) {
      throw new HttpException(
        `Category name "${newName}" already exists at this hierarchy level`,
        409,
      );
    }
  }
  // 4. Create snapshot before modification (atomic with update)
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot with current state
    await tx.ecommerce_category_snapshots.create({
      data: {
        id: v4(),
        ecommerce_category_id: props.categoryId,
        parent_category_id: category.parent_id,
        name: category.name,
        description: category.description,
        created_at: new Date(),
      },
    });
    // Update category
    await tx.ecommerce_categories.update({
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
  });
  // 5. Fetch and return updated category
  const updated = await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
    ...EcommerceCategoryTransformer.select(),
  });
  return await EcommerceCategoryTransformer.transform(updated);
}
