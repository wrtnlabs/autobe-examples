import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Check if category exists and is not soft-deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Check if category has any child categories (prevent orphaned hierarchy)
  const childCategories =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        parent_id: props.categoryId,
        deleted_at: null,
      },
    });

  if (childCategories) {
    throw new HttpException(
      "Cannot delete category with child categories",
      400,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_categories.delete({
    where: {
      id: props.categoryId,
    },
  });
}
