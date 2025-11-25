import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function getShoppingMallCategoriesCategorySlug(props: {
  categorySlug: string;
}): Promise<IShoppingMallCategory> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      slug: props.categorySlug,
    },
    include: {
      parent: true,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: category.id,
    parent_id: category.parent_id ?? undefined,
    parent: category.parent
      ? {
          id: category.parent.id,
          name: category.parent.name,
          slug: category.parent.slug,
          description: category.parent.description ?? undefined,
          image_url: category.parent.image_url ?? undefined,
          parent_id: category.parent.parent_id ?? undefined,
          status: typia.assert<"active" | "inactive">(category.parent.status),
          display_order: category.parent.display_order,
          product_count: category.parent.product_count,
          created_at: toISOStringSafe(category.parent.created_at),
          updated_at: toISOStringSafe(category.parent.updated_at),
        }
      : undefined,
    name: category.name,
    slug: category.slug,
    description: category.description ?? undefined,
    image_url: category.image_url ?? undefined,
    display_order: category.display_order,
    status: typia.assert<"active" | "inactive">(category.status),
    product_count: category.product_count,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : undefined,
  };
}
