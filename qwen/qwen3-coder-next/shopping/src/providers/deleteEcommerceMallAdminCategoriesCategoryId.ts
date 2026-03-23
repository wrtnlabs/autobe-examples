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
  categoryId: string;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
    });
  // Reassign products in this category to parent category or mark uncategorized
  await MyGlobal.prisma.ecommerce_mall_products.updateMany({
    where: { category_id: props.categoryId },
    data: {
      category_id: category.parent_category_id ?? undefined,
    },
  });
  // Cascade delete subcategories
  await MyGlobal.prisma.ecommerce_mall_categories.deleteMany({
    where: { parent_category_id: props.categoryId },
  });
  // Delete the category itself
  await MyGlobal.prisma.ecommerce_mall_categories.delete({
    where: { id: props.categoryId },
  });
}
