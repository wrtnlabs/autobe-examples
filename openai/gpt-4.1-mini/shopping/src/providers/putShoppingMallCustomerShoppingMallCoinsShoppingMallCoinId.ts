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

export async function putShoppingMallCustomerShoppingMallCoinsShoppingMallCoinId(props: {
  customer: CustomerPayload;
  shoppingMallCoinId: string & tags.Format<"uuid">;
  body: IShoppingMallCoin.IUpdate;
}): Promise<IShoppingMallCoin> {
  const coin = await MyGlobal.prisma.shopping_mall_coins.findUnique({
    where: { id: props.shoppingMallCoinId },
  });

  if (!coin) {
    throw new HttpException("Shopping mall coin not found", 404);
  }

  if (coin.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_coins.update({
    where: { id: props.shoppingMallCoinId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
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

  return {
    id: updated.id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    amount: updated.amount,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
