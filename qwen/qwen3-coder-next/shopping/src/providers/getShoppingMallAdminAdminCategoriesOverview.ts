import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function getShoppingMallAdminAdminCategoriesOverview(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallCategory> {
  // Count active categories (where deleted_at is null)
  const activeCategories = await MyGlobal.prisma.shopping_mall_categories.count(
    {
      where: { deleted_at: null },
    },
  );
  // Count total categories
  const totalCategories =
    await MyGlobal.prisma.shopping_mall_categories.count();
  // Count active subcategories (where deleted_at is null)
  const activeSubcategories =
    await MyGlobal.prisma.shopping_mall_subcategories.count({
      where: { deleted_at: null },
    });
  // Count total subcategories
  const totalSubcategories =
    await MyGlobal.prisma.shopping_mall_subcategories.count();
  // Build response object with overview statistics
  return {
    categories: {
      active: activeCategories,
      total: totalCategories,
    },
    subcategories: {
      active: activeSubcategories,
      total: totalSubcategories,
    },
  };
}
