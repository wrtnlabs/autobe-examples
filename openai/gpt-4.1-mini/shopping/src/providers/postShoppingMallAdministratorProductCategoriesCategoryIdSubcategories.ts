import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductSubcategoryCollector } from "../collectors/ShoppingMallProductSubcategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorProductCategoriesCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.ICreate;
}): Promise<IShoppingMallProductSubcategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.categoryId },
    });
  if (category === null) {
    throw new HttpException("Product category not found", 404);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallProductSubcategoryCollector.collect({
      body: props.body,
      shoppingMallProductCategories: category,
    });
    // Check name uniqueness with collected data.name
    const existing = await tx.shopping_mall_product_subcategories.findFirst({
      where: {
        shopping_mall_product_category_id: props.categoryId,
        name: data.name,
      },
    });
    if (existing !== null) {
      throw new HttpException("Product subcategory name conflict", 409);
    }
    const created = await tx.shopping_mall_product_subcategories.create({
      data,
    });
    return {
      id: created.id,
      shopping_mall_product_category_id:
        created.shopping_mall_product_category_id,
      name: created.name,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  });
}
