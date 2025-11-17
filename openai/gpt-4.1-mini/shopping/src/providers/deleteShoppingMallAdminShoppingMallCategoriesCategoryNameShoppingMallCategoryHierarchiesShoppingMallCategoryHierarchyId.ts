import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallCategoriesCategoryNameShoppingMallCategoryHierarchiesShoppingMallCategoryHierarchyId(props: {
  admin: AdminPayload;
  categoryName: string;
  shoppingMallCategoryHierarchyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.categoryName },
  });

  if (!category) {
    throw new HttpException(
      `Category with name ${props.categoryName} not found.`,
      404,
    );
  }

  const hierarchy =
    await MyGlobal.prisma.shopping_mall_category_hierarchies.findFirst({
      where: {
        id: props.shoppingMallCategoryHierarchyId,
        parent_category_id: category.id,
      },
    });

  if (!hierarchy) {
    throw new HttpException(
      `Shopping mall category hierarchy with ID ${props.shoppingMallCategoryHierarchyId} not found for category ${props.categoryName}.`,
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_category_hierarchies.delete({
    where: { id: props.shoppingMallCategoryHierarchyId },
  });
}
