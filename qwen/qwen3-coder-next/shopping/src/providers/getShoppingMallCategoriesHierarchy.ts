import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesHierarchy(): Promise<IShoppingMallCategory.ISummary> {
  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    include: {
      subcategories: {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
      },
    },
  });
  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        description: subcategory.description,
        created_at: toISOStringSafe(subcategory.created_at),
        updated_at: toISOStringSafe(subcategory.updated_at),
      })),
    })),
  };
}
