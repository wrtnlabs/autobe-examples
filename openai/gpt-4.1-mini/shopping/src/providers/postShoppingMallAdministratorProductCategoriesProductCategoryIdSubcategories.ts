import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
import { ShoppingMallProductSubcategoryTransformer } from "../transformers/ShoppingMallProductSubcategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorProductCategoriesProductCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.ICreate;
}): Promise<IShoppingMallProductSubcategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.productCategoryId },
      select: { id: true },
    });
  if (!category) {
    throw new HttpException("Parent product category not found", 404);
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUnique({
      where: {
        shopping_mall_product_category_id_name: {
          shopping_mall_product_category_id: props.productCategoryId,
          name: props.body.name,
        },
      },
      select: { id: true },
    });
  if (existing) {
    throw new HttpException(
      "Subcategory name must be unique within the parent category",
      409,
    );
  }
  const data = await ShoppingMallProductSubcategoryCollector.collect({
    body: props.body,
    shoppingMallProductCategories: category,
  });
  const created =
    await MyGlobal.prisma.shopping_mall_product_subcategories.create({
      data,
      ...ShoppingMallProductSubcategoryTransformer.select(),
    });
  return await ShoppingMallProductSubcategoryTransformer.transform(created);
}
