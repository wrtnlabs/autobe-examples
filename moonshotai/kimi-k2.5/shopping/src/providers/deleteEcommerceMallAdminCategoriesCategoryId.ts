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
  // Find the category and verify it exists and is not already deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: { id: true, deleted_at: true },
  });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // Recursively find all descendant category IDs
  const allCategoryIds: string[] = [props.categoryId];
  const queue: string[] = [props.categoryId];
  while (queue.length > 0) {
    const currentParentId = queue.shift()!;
    const children = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: {
        parent_id: currentParentId,
        deleted_at: null,
      },
      select: { id: true },
    });
    for (const child of children) {
      allCategoryIds.push(child.id);
      queue.push(child.id);
    }
  }
  // Execute transaction: uncategorize products and soft delete categories
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Uncategorize all products in this category and all subcategories
    await tx.ecommerce_mall_products.updateMany({
      where: {
        category_id: {
          in: allCategoryIds,
        },
        deleted_at: null,
      },
      data: {
        category_id: null,
        updated_at: new Date(),
      },
    });
    // Step 2: Soft delete all subcategories (excluding the main category)
    const subcategoryIds = allCategoryIds.filter(
      (id) => id !== props.categoryId,
    );
    if (subcategoryIds.length > 0) {
      await tx.ecommerce_mall_categories.updateMany({
        where: {
          id: {
            in: subcategoryIds,
          },
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Step 3: Soft delete the main category
    await tx.ecommerce_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
