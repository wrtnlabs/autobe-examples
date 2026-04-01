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
  // Find the category by ID
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, deleted_at: true },
    });
  // Check if already deleted
  if (category.deleted_at !== null) {
    throw new HttpException("Category is already deleted", 409);
  }
  // Find and soft delete all subcategories
  await MyGlobal.prisma.shopping_mall_categories.updateMany({
    where: {
      parent_id: props.categoryId,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Soft delete the target category
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: new Date(),
    },
  });
}
