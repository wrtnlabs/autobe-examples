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

export async function deleteEcommerceAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify category exists and is not already deleted
  const category = await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow(
    {
      where: { id: props.categoryId },
      select: { id: true, deleted_at: true },
    },
  );
  // Check if already deleted
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found or already deleted", 404);
  }
  // Update subcategories to remove parent reference (become root categories)
  await MyGlobal.prisma.ecommerce_categories.updateMany({
    where: { parent_id: props.categoryId },
    data: { parent_id: { set: null } },
  });
  // Update products to remove category reference (become uncategorized)
  await MyGlobal.prisma.ecommerce_products.updateMany({
    where: { category_id: props.categoryId },
    data: { category_id: { set: undefined } },
  });
  // Soft delete the category
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
