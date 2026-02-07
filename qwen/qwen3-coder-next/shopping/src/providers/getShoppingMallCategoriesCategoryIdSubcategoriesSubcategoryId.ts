import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  categoryId: string;
  subcategoryId: string;
}): Promise<IShoppingMallSubcategory> {
  const subcategory =
    await MyGlobal.prisma.shopping_mall_subcategories.findUnique({
      where: {
        id: props.subcategoryId,
        shopping_mall_category_id: props.categoryId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!subcategory) {
    throw new HttpException("Subcategory not found", 404);
  }
  return {
    id: subcategory.id as string & tags.Format<"uuid">,
    name: subcategory.name,
    description: subcategory.description ?? null,
    created_at: toISOStringSafe(subcategory.created_at),
    updated_at: toISOStringSafe(subcategory.updated_at),
    deleted_at: subcategory.deleted_at
      ? toISOStringSafe(subcategory.deleted_at)
      : null,
  };
}
