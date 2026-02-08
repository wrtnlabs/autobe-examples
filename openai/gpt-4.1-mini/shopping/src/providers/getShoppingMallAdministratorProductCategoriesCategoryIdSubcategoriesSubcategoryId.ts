import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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

export async function getShoppingMallAdministratorProductCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSubcategory> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUnique({
      where: { id: props.subcategoryId },
    });
  if (
    !record ||
    record.shopping_mall_product_category_id !== props.categoryId
  ) {
    throw new HttpException("Product subcategory not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_product_category_id: record.shopping_mall_product_category_id,
    name: record.name,
    description: record.description === null ? null : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
