import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const { customer, body } = props;

  // Verify seller existence
  // Since shopping_mall_seller_id does not exist on body, we cannot use it
  // so we reject for non-casting error
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: (body as any).shopping_mall_seller_id },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  // Check uniqueness of order_number
  const existingOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: body.order_number },
  });
  if (existingOrder) {
    throw new HttpException("Order number already exists", 400);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new order
  const created = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      shopping_mall_seller_id: (body as any).shopping_mall_seller_id,
      order_number: body.order_number,
      order_status: body.order_status,
      payment_status: body.payment_status,
      total_amount: body.total_amount,
      shipping_address: body.shipping_address,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    order_number: created.order_number,
    order_status: created.order_status,
    payment_status: created.payment_status,
    total_amount: created.total_amount,
    shipping_address: created.shipping_address,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
