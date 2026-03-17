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

export async function deleteShoppingMallAdminAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify category exists and is not already deleted
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
  // Check for subcategories - must be empty before deletion
  const subcategoryCount = await MyGlobal.prisma.shopping_mall_categories.count(
    {
      where: {
        parent_category_id: props.categoryId,
        deleted_at: null,
      },
    },
  );
  if (subcategoryCount > 0) {
    throw new HttpException(
      "Cannot delete category with subcategories. Please remove or reassign all subcategories first.",
      400,
    );
  }
  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: {
      id: props.categoryId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
