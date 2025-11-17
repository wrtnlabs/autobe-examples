import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShoppingMallProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const existingProduct =
    await MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { code: props.body.code },
    });

  if (existingProduct !== null) {
    throw new HttpException("Product code already exists", 400);
  }

  // Since 'code' field does not exist in shopping_mall_categories schema, category lookup by code is impossible
  // Fallback: Try to find a category by a common existing field or fail
  // Here we cannot proceed properly because category_code filtering is not possible
  // Hence, throw an error indicating the category lookup is unsupported

  throw new HttpException(
    `Category code lookup is unsupported in database schema. Cannot proceed with category code: '${props.body.category_code}'.`,
    400,
  );
}
