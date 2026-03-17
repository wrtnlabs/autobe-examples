import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Verify seller is not suspended
  const sellerRecord =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { id: true, suspended: true },
    });
  if (sellerRecord.suspended) {
    throw new HttpException(
      "Your account is suspended. You cannot create products.",
      403,
    );
  }
  // Validate category exists and is not deleted
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.body.categoryId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Use collector to build create input
  const createInput = await ShoppingMallProductCollector.collect({
    body: props.body,
    seller: { id: props.seller.id },
  });
  // Create the product
  const product = await MyGlobal.prisma.shopping_mall_products.create({
    data: createInput,
    ...ShoppingMallProductTransformer.select(),
  });
  // Transform and return
  return await ShoppingMallProductTransformer.transform(product);
}
