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
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  const childCategories = await MyGlobal.prisma.shopping_mall_categories.count({
    where: { parent_id: props.categoryId },
  });

  if (childCategories > 0) {
    throw new HttpException(
      "Cannot delete category with child categories. Please delete or reassign child categories first.",
      400,
    );
  }

  const associatedSales = await MyGlobal.prisma.shopping_mall_sales.count({
    where: { category: { id: props.categoryId } },
  });

  if (associatedSales > 0) {
    throw new HttpException(
      "Cannot delete category with associated products. Please reassign or delete products first.",
      400,
    );
  }

  await MyGlobal.prisma.shopping_mall_categories.delete({
    where: { id: props.categoryId },
  });
}
