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

export async function deleteEcommerceMallAdminAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the category exists
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
    select: { id: true },
  });
  // Find all direct subcategories of the target category
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: { parent_id: props.categoryId },
      select: { id: true },
    });
  const allCategoryIds = [props.categoryId, ...subcategories.map((s) => s.id)];
  const now = new Date();
  // Execute soft delete within a transaction to ensure atomicity
  await MyGlobal.prisma.$transaction([
    // Step 1: Uncategorize all products in target category and subcategories
    MyGlobal.prisma.ecommerce_mall_products.updateMany({
      where: { ecommerce_mall_category_id: { in: allCategoryIds } },
      data: { ecommerce_mall_category_id: undefined },
    }),
    // Step 2: Soft delete all subcategories
    MyGlobal.prisma.ecommerce_mall_categories.updateMany({
      where: { parent_id: props.categoryId },
      data: { deleted_at: now },
    }),
    // Step 3: Soft delete the target category
    MyGlobal.prisma.ecommerce_mall_categories.update({
      where: { id: props.categoryId },
      data: { deleted_at: now },
    }),
  ]);
}
