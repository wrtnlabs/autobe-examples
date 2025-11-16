import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallCoinsShoppingMallCoinId(props: {
  customer: CustomerPayload;
  shoppingMallCoinId: string & tags.Format<"uuid">;
}): Promise<void> {
  const coin = await MyGlobal.prisma.shopping_mall_coins.findUnique({
    where: { id: props.shoppingMallCoinId },
  });
  if (coin === null || coin.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Shopping mall coin not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_coins.delete({
    where: { id: props.shoppingMallCoinId },
  });
}
