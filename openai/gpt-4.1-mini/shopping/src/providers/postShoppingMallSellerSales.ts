import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleCollector } from "../collectors/ShoppingMallSaleCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleTransformer } from "../transformers/ShoppingMallSaleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSale.ICreate;
}): Promise<IShoppingMallSale> {
  // Prepare the create data using collector
  const data = await ShoppingMallSaleCollector.collect({
    body: props.body,
    seller: { id: props.seller.id },
  });
  // Insert the new sale listing into the database
  const created = await MyGlobal.prisma.shopping_mall_sales.create({
    data,
    ...ShoppingMallSaleTransformer.select(),
  });
  // Transform the Prisma result into API response DTO
  return await ShoppingMallSaleTransformer.transform(created);
}
