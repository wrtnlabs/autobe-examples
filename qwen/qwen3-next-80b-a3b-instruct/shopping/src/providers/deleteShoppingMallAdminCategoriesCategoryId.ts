import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
}): Promise<void> {
  // Verify category exists
  const category = await MyGlobal.prisma.shopping_mall_sections.findUnique({
    where: { id: props.categoryId },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  // Validate that no products use this category as their categoryId
  const productsUsingCategory =
    await MyGlobal.prisma.shopping_mall_products.count({
      where: { category_id: props.categoryId },
    });
  if (productsUsingCategory > 0) {
    throw new HttpException(
      "Cannot delete category: products are still using this category",
      400,
    );
  }
  // Validate that no other categories have this category as their parentId
  const childCategories = await MyGlobal.prisma.shopping_mall_sections.count({
    where: { parent: { id: props.categoryId } },
  });
  if (childCategories > 0) {
    throw new HttpException(
      "Cannot delete category: child categories exist",
      400,
    );
  }
  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_sections.delete({
    where: { id: props.categoryId },
  });
}
