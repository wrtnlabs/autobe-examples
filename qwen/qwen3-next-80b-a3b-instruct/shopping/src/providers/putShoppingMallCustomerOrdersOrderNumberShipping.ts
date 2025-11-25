import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderNumberShipping(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipping.IUpdate;
}): Promise<IShoppingMallOrderShipping> {
  // Find the order by its order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
      status: {
        in: ["draft", "pending_payment"],
      },
    },
  });

  if (!order) {
    throw new HttpException("Order not found or not editable", 404);
  }

  // Update the shipping record
  const updatedShipping =
    await MyGlobal.prisma.shopping_mall_order_shipping.update({
      where: {
        shopping_mall_order_id: order.id,
      },
      data: {
        ...props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    ...updatedShipping,
    created_at: toISOStringSafe(updatedShipping.created_at),
    updated_at: toISOStringSafe(updatedShipping.updated_at),
    estimated_delivery_date: toISOStringSafe(
      updatedShipping.estimated_delivery_date ?? new Date(),
    ),
    real_delivery_date: toISOStringSafe(
      updatedShipping.real_delivery_date ?? new Date(),
    ),
    address_line2: updatedShipping.address_line2 ?? undefined,
    carrier: updatedShipping.carrier ?? undefined,
    tracking_number: updatedShipping.tracking_number ?? undefined,
    tracking_url: updatedShipping.tracking_url ?? undefined,
  };
}
