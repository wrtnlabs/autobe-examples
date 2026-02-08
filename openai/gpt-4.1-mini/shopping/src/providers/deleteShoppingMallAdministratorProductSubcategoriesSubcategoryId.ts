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

export async function deleteShoppingMallAdministratorProductSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  subcategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSubcategory> {
  const existing =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUnique({
      where: { id: props.subcategoryId },
    });
  if (!existing) {
    throw new HttpException("Product subcategory not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_product_subcategories.delete({
    where: { id: props.subcategoryId },
  });
  // IShoppingMallProductSubcategory is an empty object type {}
  return {};
}
