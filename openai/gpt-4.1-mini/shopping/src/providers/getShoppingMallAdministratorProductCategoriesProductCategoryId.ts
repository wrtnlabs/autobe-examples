import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductCategoryTransformer } from "../transformers/ShoppingMallProductCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductCategoriesProductCategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductCategory> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
      where: { id: props.productCategoryId },
      ...ShoppingMallProductCategoryTransformer.select(),
    });
  return await ShoppingMallProductCategoryTransformer.transform(record);
}
