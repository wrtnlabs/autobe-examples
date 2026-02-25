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

export async function getShoppingMallCategoriesHierarchy(): Promise<IShoppingMallCategory.IInvert> {
  // Query all categories to build complete hierarchy
  const allCategories = await MyGlobal.prisma.shopping_mall_categories.findMany(
    {
      where: { deleted_at: null },
      orderBy: [{ parent_category_id: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  // Build category map with children arrays
  const categoryMap = new Map<
    string,
    {
      data: (typeof allCategories)[0];
      children: (typeof allCategories)[0][];
    }
  >();
  // Initialize all categories in map
  for (const category of allCategories) {
    categoryMap.set(category.id, {
      data: category,
      children: [],
    });
  }
  // Build parent-child relationships
  for (const category of allCategories) {
    if (category.parent_category_id !== null) {
      const parent = categoryMap.get(category.parent_category_id);
      if (parent) {
        parent.children.push(category);
      }
    }
  }
  // Get root categories (those with no parent)
  const rootCategories = allCategories.filter(
    (c) => c.parent_category_id === null,
  );
  // Transform to IInvert format
  const children = await ArrayUtil.asyncMap(
    rootCategories,
    async (category) => {
      const categoryData = categoryMap.get(category.id)!.data;
      const childrenList = categoryMap.get(category.id)!.children;
      return {
        id: categoryData.id,
        name: categoryData.name,
        description: categoryData.description ?? null,
        parent_category_id: categoryData.parent_category_id ?? null,
        created_at: categoryData.created_at.toISOString(),
        updated_at: categoryData.updated_at.toISOString(),
        deleted_at: categoryData.deleted_at?.toISOString() ?? null,
        children: await ArrayUtil.asyncMap(childrenList, (child) => {
          return {
            id: child.id,
            name: child.name,
            description: child.description ?? null,
            parent: {
              id: categoryData.id,
              name: categoryData.name,
              description: categoryData.description ?? null,
              parent: null,
              subcategory_count: 0,
            } satisfies IShoppingMallCategory.ISummary,
            subcategory_count: 0,
          } satisfies IShoppingMallCategory.ISummary;
        }),
      } satisfies IShoppingMallCategory.IInvert;
    },
  );
  // Return first category if single root, or construct combined structure
  if (children.length === 0) {
    return {
      id: v4(),
      name: "Categories",
      description: null,
      parent_category_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      children: [],
    };
  } else if (children.length === 1) {
    return children[0];
  } else {
    return {
      id: v4(),
      name: "Categories",
      description: null,
      parent_category_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      children: children,
    };
  }
}
