import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";

export async function putShoppingMallMyOrdersOrderNumberShipping(props: {
  orderNumber: string;
  body: IShoppingMallOrderShipping.IUpdate;
}): Promise<IShoppingMallOrderShipping> {
  // Find order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Validate order status is updateable
  if (!["draft", "pending_payment"].includes(order.status)) {
    throw new HttpException(
      "Shipping details cannot be updated after order is confirmed or shipped",
      403,
    );
  }

  // Update shipping information
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
    id: updatedShipping.id,
    shopping_mall_order_id: updatedShipping.shopping_mall_order_id,
    shopping_mall_shipping_method_id:
      updatedShipping.shopping_mall_shipping_method_id,
    first_name: updatedShipping.first_name,
    last_name: updatedShipping.last_name,
    address_line1: updatedShipping.address_line1,
    address_line2:
      updatedShipping.address_line2 === null
        ? undefined
        : updatedShipping.address_line2,
    city: updatedShipping.city,
    state: updatedShipping.state,
    postal_code: updatedShipping.postal_code,
    country: updatedShipping.country,
    phone: updatedShipping.phone,
    carrier:
      updatedShipping.carrier === null ? undefined : updatedShipping.carrier,
    tracking_number:
      updatedShipping.tracking_number === null
        ? undefined
        : updatedShipping.tracking_number,
    tracking_url:
      updatedShipping.tracking_url === null
        ? undefined
        : updatedShipping.tracking_url,
    estimated_delivery_date:
      updatedShipping.estimated_delivery_date === null
        ? undefined
        : toISOStringSafe(updatedShipping.estimated_delivery_date),
    real_delivery_date:
      updatedShipping.real_delivery_date === null
        ? undefined
        : toISOStringSafe(updatedShipping.real_delivery_date),
    created_at: toISOStringSafe(updatedShipping.created_at),
    updated_at: toISOStringSafe(updatedShipping.updated_at),
  };
}
