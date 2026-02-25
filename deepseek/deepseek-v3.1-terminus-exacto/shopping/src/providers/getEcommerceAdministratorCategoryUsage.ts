import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorCategoryUsage(props: {
  administrator: AdministratorPayload;
}): Promise<IEcommerceCategory> {
  // First, get the main category structure with product counts
  const categoriesWithStats =
    await MyGlobal.prisma.ecommerce_categories.findMany({
      where: {
        deleted_at: null,
        parent_category_id: null, // Focus on top-level categories for overall usage
      },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Count total products in this category
        _count: {
          select: {
            products: {
              where: { deleted_at: null },
            },
          },
        },
        // Get subcategories and their product counts
        subcategories: {
          where: { deleted_at: null },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                products: {
                  where: { deleted_at: null },
                },
              },
            },
          },
        },
      },
      orderBy: [{ products: { _count: "desc" } }],
    });
  if (categoriesWithStats.length === 0) {
    throw new HttpException("No categories found", 404);
  }
  // Use the first category as the primary response
  const mainCategory = categoriesWithStats[0];
  // Transform to IEcommerceCategory format
  return {
    id: mainCategory.id as string & tags.Format<"uuid">,
    name: mainCategory.name,
    description: mainCategory.description ?? null,
    parent_category_id: null,
    parent: null,
    created_at: toISOStringSafe(mainCategory.created_at),
    updated_at: toISOStringSafe(mainCategory.updated_at),
    deleted_at: mainCategory.deleted_at
      ? toISOStringSafe(mainCategory.deleted_at)
      : null,
  };
}
