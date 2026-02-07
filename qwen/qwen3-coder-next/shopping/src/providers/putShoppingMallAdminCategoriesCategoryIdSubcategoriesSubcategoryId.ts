import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
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

export async function putShoppingMallAdminCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
  subcategoryId: string;
  body: IShoppingMallSubcategory.IUpdate;
}): Promise<IShoppingMallSubcategory> {
  const existing = await MyGlobal.prisma.shopping_mall_subcategories.findFirst({
    where: {
      id: props.subcategoryId,
      shopping_mall_category_id: props.categoryId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("Subcategory not found", 404);
  }
  const updated = await MyGlobal.prisma.shopping_mall_subcategories.update({
    where: { id: props.subcategoryId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    shopping_mall_category_id: updated.shopping_mall_category_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
