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
  // Verify user has admin role
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  // Find and delete category
  const deleted = await MyGlobal.prisma.shopping_mall_categories.delete({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  if (!deleted) {
    throw new HttpException("Category not found", 404);
  }
  // Update all products in that category to uncategorized
  await MyGlobal.prisma.shopping_mall_products.updateMany({
    where: {
      shopping_mall_subcategory_id: deleted.id,
      deleted_at: null,
    },
    data: {
      status: "inactive" as any,
    },
  });
}
