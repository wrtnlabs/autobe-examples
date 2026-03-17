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
  // Step 1: Find the category (throws 404 if not found)
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        children: {
          select: { id: true },
        },
      },
    });
  // Step 2: Collect all affected category IDs (target + direct children/subcategories)
  const affectedCategoryIds: string[] = [
    category.id,
    ...category.children.map((child) => child.id),
  ];
  // Step 3: Transaction — nullify products' category, then delete the category
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 3a: Uncategorize all products assigned to these categories
    await tx.shopping_mall_products.updateMany({
      where: {
        shopping_mall_category_id: {
          in: affectedCategoryIds,
        },
      },
      data: {
        shopping_mall_category_id: null,
      },
    });
    // 3b: Delete the category (cascade removes children automatically)
    await tx.shopping_mall_categories.delete({
      where: { id: props.categoryId },
    });
  });
}
