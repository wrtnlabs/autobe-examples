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
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
    });
  if (category.deleted_at !== null) {
    throw new HttpException("Category is already deleted", 400);
  }
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: { parent_category_id: props.categoryId },
      select: { id: true, name: true },
    });
  if (subcategories.length > 0) {
    const subcategoryNames = subcategories.map((sc) => sc.name).join(", ");
    throw new HttpException(
      `Cannot delete category with subcategories: ${subcategoryNames}`,
      400,
    );
  }
  const productCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: { category_id: props.categoryId },
  });
  if (productCount > 0) {
    throw new HttpException(
      `Cannot delete category with ${productCount} products assigned. Please reassign products first.`,
      400,
    );
  }
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const snapshotId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_category_id: props.categoryId,
      snapshot_created_at: now,
      name: category.name,
      description: category.description,
      is_leaf: category.is_leaf,
      created_at: category.created_at,
      updated_at: category.updated_at,
      parent_category_id: category.parent_category_id,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: { deleted_at: now },
  });
}
