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

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Validate seller is approved (not suspended)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { id: true, approval_status: true },
  });
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller account is suspended", 403);
  }
  // Validate category exists
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_category_id },
  });
  // Create product using collector and transformer
  const record = await MyGlobal.prisma.shopping_mall_products.create({
    data: await ShoppingMallProductCollector.collect({
      body: props.body,
      shoppingMallSellers: { id: props.seller.id },
    }),
    ...ShoppingMallProductTransformer.select(),
  });
  return await ShoppingMallProductTransformer.transform(record);
}
