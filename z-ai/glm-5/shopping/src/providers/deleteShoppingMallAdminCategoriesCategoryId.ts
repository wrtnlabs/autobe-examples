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

export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
}): Promise<void> {
  // Find the category (must exist and not be deleted)
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  const now = new Date();
  // Find all child subcategories
  const children = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: {
      parent_id: props.categoryId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);
  const allCategoryIds = [props.categoryId, ...childIds];
  // Execute transaction: soft-delete category and children, uncategorize products
  await MyGlobal.prisma.$transaction([
    // Soft-delete the main category
    MyGlobal.prisma.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: { deleted_at: now, updated_at: now },
    }),
    // Soft-delete all child subcategories
    MyGlobal.prisma.shopping_mall_categories.updateMany({
      where: {
        parent_id: props.categoryId,
        deleted_at: null,
      },
      data: { deleted_at: now, updated_at: now },
    }),
    // Uncategorize all products in deleted categories
    MyGlobal.prisma.shopping_mall_products.updateMany({
      where: {
        category_id: { in: allCategoryIds },
      },
      data: {
        category_id: null,
        updated_at: now,
      },
    }),
  ]);
}
