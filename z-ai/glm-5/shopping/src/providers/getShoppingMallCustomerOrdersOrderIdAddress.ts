import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderAddressTransformer } from "../transformers/ShoppingMallOrderAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdAddress(props: {
  customer: CustomerPayload;
  orderId: string;
}): Promise<IShoppingMallOrderAddress> {
  // 1. Verify order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get the address snapshot using transformer
  const address =
    await MyGlobal.prisma.shopping_mall_order_addresses.findUniqueOrThrow({
      where: { shopping_mall_order_id: props.orderId },
      ...ShoppingMallOrderAddressTransformer.select(),
    });
  // 3. Return transformed address
  return await ShoppingMallOrderAddressTransformer.transform(address);
}
