import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallCategoriesCategoryNameShoppingMallCategoryHierarchiesShoppingMallCategoryHierarchyId(props: {
  customer: CustomerPayload;
  categoryName: string;
  shoppingMallCategoryHierarchyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategoryHierarchy> {
  const parentCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { name: props.categoryName },
    });
  if (!parentCategory) {
    throw new HttpException("Parent category not found.", 404);
  }

  const hierarchy =
    await MyGlobal.prisma.shopping_mall_category_hierarchies.findUnique({
      where: { id: props.shoppingMallCategoryHierarchyId },
    });
  if (!hierarchy) {
    throw new HttpException("Category hierarchy entry not found.", 404);
  }

  if (hierarchy.parent_category_id !== parentCategory.id) {
    throw new HttpException(
      "Hierarchy entry does not belong to the specified parent category.",
      404,
    );
  }

  const childCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: hierarchy.child_category_id },
    });
  if (!childCategory) {
    throw new HttpException("Child category not found.", 404);
  }

  return {
    id: hierarchy.id,
    parent_category_name: props.categoryName,
    child_category_name: childCategory.name,
    is_active: true,
    created_at: toISOStringSafe(hierarchy.created_at),
    updated_at: hierarchy.updated_at
      ? toISOStringSafe(hierarchy.updated_at)
      : undefined,
  };
}
