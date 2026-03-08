import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify category exists and is not already deleted
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId, deleted_at: null },
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
  // 2. Check for subcategories - prevent deletion if any exist
  const subcategoryCount =
    await MyGlobal.prisma.ecommerce_mall_categories.count({
      where: { parent_id: props.categoryId },
    });
  if (subcategoryCount > 0) {
    throw new HttpException(
      "Cannot delete category with subcategories. Delete or reassign subcategories first.",
      400,
    );
  }
  // 3. Get all products in this category to uncategorize them
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: { category_id: props.categoryId },
    select: { id: true },
  });
  // 4. Create snapshot before deletion
  const snapshotId = v4() as string & tags.Format<"uuid">;
  const previousValues = JSON.stringify({
    id: category.id,
    name: category.name,
    description: category.description,
    parent_id: category.parent_id,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  });
  const currentValues = JSON.stringify({
    id: category.id,
    name: category.name,
    description: category.description,
    parent_id: category.parent_id,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(new Date()),
    deleted_at: toISOStringSafe(new Date()),
  });
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: snapshotId,
      category_id: props.categoryId,
      admin_id: props.admin.id,
      previous_values: previousValues,
      current_values: currentValues,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 5. Update all products to uncategorized (set category_id to null)
  if (products.length > 0) {
    await MyGlobal.prisma.ecommerce_mall_products.updateMany({
      where: { category_id: props.categoryId },
      data: { category_id: { set: undefined } },
    });
  }
  // 6. Soft delete the category
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
