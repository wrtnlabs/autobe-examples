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
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify category exists and check if already deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  if (category.deleted_at !== null) {
    throw new HttpException("Category already deleted", 409);
  }
  // Step 2: Cascade delete subcategories (soft delete)
  await MyGlobal.prisma.shopping_mall_categories.updateMany({
    where: {
      parent_id: props.categoryId,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 3: Soft delete the target category
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: new Date(),
    },
  });
}
