import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the category and check if it's not soft-deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
  });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // 2. Check if products exist in this category
  const productsCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      shopping_mall_category_id: props.categoryId,
      deleted_at: null,
    },
  });
  if (productsCount > 0) {
    throw new HttpException(
      "Cannot delete category with existing products. Reassign products first.",
      400,
    );
  }
  // Use transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 3. Promote subcategories to top-level (set parent_id to null)
    await tx.shopping_mall_categories.updateMany({
      where: { parent_id: props.categoryId },
      data: {
        parent_id: null,
        updated_at: new Date(),
      },
    });
    // 4. Soft delete the category
    await tx.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
