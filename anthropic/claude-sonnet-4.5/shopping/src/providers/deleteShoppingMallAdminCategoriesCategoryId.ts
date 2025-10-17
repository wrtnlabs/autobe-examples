import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { categoryId } = props;

  // Fetch the category to validate existence and check if already deleted
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: categoryId },
      select: {
        id: true,
        deleted_at: true,
      },
    });

  // Check if category is already soft-deleted
  if (category.deleted_at !== null) {
    throw new HttpException("Category has already been deleted", 400);
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: categoryId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
