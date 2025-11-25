import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallOrdersOrderNumberShipping(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipping.IUpdate;
}): Promise<IShoppingMallOrderShipping> {
  // Find the order by its unique order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Verify order status allows shipping updates (only draft or pending_payment)
  if (order.status !== "draft" && order.status !== "pending_payment") {
    throw new HttpException(
      "Shipping information cannot be updated after order is confirmed",
      403,
    );
  }

  // Find the corresponding shipping record
  const shipping =
    await MyGlobal.prisma.shopping_mall_order_shipping.findUnique({
      where: {
        shopping_mall_order_id: order.id,
      },
    });

  if (!shipping) {
    throw new HttpException("Shipping information not found", 404);
  }

  // Update the shipping record with the provided fields
  const updatedShipping =
    await MyGlobal.prisma.shopping_mall_order_shipping.update({
      where: {
        id: shipping.id,
      },
      data: {
        first_name: props.body.first_name,
        last_name: props.body.last_name,
        address_line1: props.body.address_line1,
        address_line2: props.body.address_line2,
        city: props.body.city,
        state: props.body.state,
        postal_code: props.body.postal_code,
        country: props.body.country,
        phone: props.body.phone,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the complete shipping record with proper date formatting
  return {
    id: updatedShipping.id,
    shopping_mall_order_id: updatedShipping.shopping_mall_order_id,
    shopping_mall_shipping_method_id:
      updatedShipping.shopping_mall_shipping_method_id,
    first_name: updatedShipping.first_name,
    last_name: updatedShipping.last_name,
    address_line1: updatedShipping.address_line1,
    address_line2:
      updatedShipping.address_line2 !== null
        ? updatedShipping.address_line2
        : undefined,
    city: updatedShipping.city,
    state: updatedShipping.state,
    postal_code: updatedShipping.postal_code,
    country: updatedShipping.country,
    phone: updatedShipping.phone,
    carrier:
      updatedShipping.carrier !== null ? updatedShipping.carrier : undefined,
    tracking_number:
      updatedShipping.tracking_number !== null
        ? updatedShipping.tracking_number
        : undefined,
    tracking_url:
      updatedShipping.tracking_url !== null
        ? updatedShipping.tracking_url
        : undefined,
    estimated_delivery_date:
      updatedShipping.estimated_delivery_date !== null
        ? toISOStringSafe(updatedShipping.estimated_delivery_date)
        : undefined,
    real_delivery_date:
      updatedShipping.real_delivery_date !== null
        ? toISOStringSafe(updatedShipping.real_delivery_date)
        : undefined,
    created_at: toISOStringSafe(updatedShipping.created_at),
    updated_at: toISOStringSafe(updatedShipping.updated_at),
  };
}
