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

export async function getShoppingMallAdministratorProductCategoriesProductCategoryIdProductSubcategoriesProductSubcategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  productSubcategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSubcategory> {
  const subcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findFirstOrThrow({
      where: {
        id: props.productSubcategoryId,
        shopping_mall_product_category_id: props.productCategoryId,
        deleted_at: null,
      },
      ...ShoppingMallProductSubcategoryTransformer.select(),
    });
  return await ShoppingMallProductSubcategoryTransformer.transform(subcategory);
}
