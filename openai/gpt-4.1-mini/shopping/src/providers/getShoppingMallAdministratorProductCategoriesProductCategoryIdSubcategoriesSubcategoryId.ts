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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSubcategoryTransformer } from "../transformers/ShoppingMallProductSubcategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductCategoriesProductCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSubcategory> {
  const subcategoryRaw =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findFirstOrThrow({
      where: {
        id: props.subcategoryId,
        shopping_mall_product_category_id: props.productCategoryId,
      },
      ...ShoppingMallProductSubcategoryTransformer.select(),
    });
  // Copy fields with date conversion using toISOStringSafe
  // We must create an object that matches IShoppingMallProductSubcategory but with dates converted to string
  const subcategoryTyped: any = {
    ...subcategoryRaw,
    created_at: toISOStringSafe(subcategoryRaw.created_at),
    updated_at: toISOStringSafe(subcategoryRaw.updated_at),
    deleted_at: subcategoryRaw.deleted_at
      ? toISOStringSafe(subcategoryRaw.deleted_at)
      : null,
  };
  return await ShoppingMallProductSubcategoryTransformer.transform(
    subcategoryTyped,
  );
}
