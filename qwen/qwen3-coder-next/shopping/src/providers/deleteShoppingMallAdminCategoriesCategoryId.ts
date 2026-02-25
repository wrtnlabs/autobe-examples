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
  // Step 1: Verify category exists and has no subcategories
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  const subcategoryCount = await MyGlobal.prisma.shopping_mall_categories.count(
    {
      where: { parent_category_id: props.categoryId },
    },
  );
  if (subcategoryCount > 0) {
    throw new HttpException(
      "Category has subcategories. Delete subcategories first.",
      409,
    );
  }
  // Step 2: Move all products in this category to uncategorized
  // Using Prisma's set operation to remove category association
  await MyGlobal.prisma.shopping_mall_products.updateMany({
    where: { shopping_mall_category_id: props.categoryId },
    data: {
      shopping_mall_category: {
        disconnect: true,
      },
    },
  });
  // Step 3: Create category snapshot preserving name and description
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: v4(),
      shopping_mall_seller_id: v4(),
      shopping_mall_category_id: category.id,
      name: category.name,
      description: category.description ?? "",
      base_price: 0,
      is_deleted: false,
      snapshot_timestamp: new Date().toISOString(),
      snapshot_version: 1,
    },
  });
  // Step 4: Soft delete the category
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
  // Step 5: Log deletion event to system audit log
  await MyGlobal.prisma.shopping_mall_system_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      operation_type: "category_delete",
      entity_type: "category",
      entity_id: props.categoryId,
      ip_address: "0.0.0.0",
      user_agent: null,
      old_values: null,
      new_values: null,
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
