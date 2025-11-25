import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const existing = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!existing || existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      ...(props.body.order_status !== undefined && {
        order_status: props.body.order_status,
      }),
      ...(props.body.payment_status !== undefined && {
        payment_status: props.body.payment_status,
      }),
      ...(props.body.total_amount !== undefined && {
        total_amount: props.body.total_amount,
      }),
      ...(props.body.shipping_address !== undefined && {
        shipping_address: props.body.shipping_address,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    order_number: updated.order_number,
    order_status: updated.order_status,
    payment_status: updated.payment_status,
    total_amount: updated.total_amount,
    shipping_address: updated.shipping_address,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
