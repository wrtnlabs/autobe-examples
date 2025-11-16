import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallCoinsShoppingMallCoinId(props: {
  customer: CustomerPayload;
  shoppingMallCoinId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCoin> {
  const coin = await MyGlobal.prisma.shopping_mall_coins.findUnique({
    where: { id: props.shoppingMallCoinId },
    select: {
      id: true,
      shopping_mall_channel_id: true,
      shopping_mall_customer_id: true,
      amount: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (coin === null) {
    throw new HttpException("Shopping mall coin not found", 404);
  }

  return {
    id: coin.id,
    shopping_mall_channel_id: coin.shopping_mall_channel_id,
    shopping_mall_customer_id: coin.shopping_mall_customer_id,
    amount: coin.amount,
    code: "",
    name: "",
    status: "active",
    created_at: toISOStringSafe(coin.created_at),
    updated_at: toISOStringSafe(coin.updated_at),
    deleted_at: coin.deleted_at ? toISOStringSafe(coin.deleted_at) : undefined,
  };
}
