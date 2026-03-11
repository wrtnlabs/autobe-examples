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
  categoryId: string;
}): Promise<void> {
  // 1. Find the category and check if it exists and is not already deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: { id: true, deleted_at: true },
  });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // 2. Check if any products are assigned to this category
  const productCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      shopping_mall_category_id: props.categoryId,
      deleted_at: null,
    },
  });
  if (productCount > 0) {
    throw new HttpException(
      "Cannot delete category with assigned products. Please reassign products first.",
      400,
    );
  }
  // 3. Promote subcategories to top-level categories and soft delete in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_categories.updateMany({
      where: { parent_id: props.categoryId },
      data: {
        parent_id: null,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
}
