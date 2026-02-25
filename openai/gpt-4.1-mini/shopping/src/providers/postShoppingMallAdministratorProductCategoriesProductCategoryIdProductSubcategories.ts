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

export async function postShoppingMallAdministratorProductCategoriesProductCategoryIdProductSubcategories(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.ICreate;
}): Promise<IShoppingMallProductSubcategory> {
  // Verify product category existence
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.productCategoryId },
      select: { id: true },
    });
  if (category === null) {
    throw new HttpException("Product category not found", 404);
  }
  // Check subcategory name uniqueness within the category
  const existingSubcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findFirst({
      where: {
        shopping_mall_product_category_id: props.productCategoryId,
        name: props.body.name,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingSubcategory !== null) {
    throw new HttpException(
      "Duplicate product subcategory name in this category",
      409,
    );
  }
  // Collect input data for creation
  const data = await ShoppingMallProductSubcategoryCollector.collect({
    body: props.body,
    shoppingMallProductCategories: category,
  });
  // Initialize timestamps as ISO strings
  const nowISOString: string & tags.Format<"date-time"> =
    new Date().toISOString();
  // Create data with explicit date-time strings and null for deleted_at
  const createData = {
    ...data,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  };
  // Perform creation
  const createdRecord =
    await MyGlobal.prisma.shopping_mall_product_subcategories.create({
      data: createData,
      ...ShoppingMallProductSubcategoryTransformer.select(),
    });
  // Transform the created record
  return await ShoppingMallProductSubcategoryTransformer.transform(
    createdRecord,
  );
}
