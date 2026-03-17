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
  categoryId: string;
}): Promise<void> {
  // Verify category exists - throws 404 if not found
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  // Find all subcategories if this is a parent category
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: { parent_id: props.categoryId },
    });
  // Collect all category IDs that will be affected (parent + subcategories)
  const allCategoryIds: string[] = [props.categoryId];
  for (const sub of subcategories) {
    allCategoryIds.push(sub.id);
  }
  // Update all products in affected categories to become uncategorized
  // The database foreign key constraint with onDelete: SetNull will handle setting category_id to null
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_products.updateMany({
    where: {
      category_id: {
        in: allCategoryIds,
      },
    },
    data: {
      updated_at: now,
    },
  });
  // Delete subcategories first if any exist (to satisfy FK constraints)
  if (subcategories.length > 0) {
    await MyGlobal.prisma.ecommerce_mall_categories.deleteMany({
      where: {
        parent_id: props.categoryId,
      },
    });
  }
  // Delete the main category
  await MyGlobal.prisma.ecommerce_mall_categories.delete({
    where: { id: props.categoryId },
  });
}
