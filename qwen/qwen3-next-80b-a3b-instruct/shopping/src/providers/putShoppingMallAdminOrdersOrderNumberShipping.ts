import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderNumberShipping(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipping.IUpdate;
}): Promise<IShoppingMallOrderShipping> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      status: {
        in: ["draft", "pending_payment"],
      },
    },
  });

  if (!order) {
    throw new HttpException("Order not found or not in editable state", 404);
  }

  const shipping = await MyGlobal.prisma.shopping_mall_order_shipping.update({
    where: {
      shopping_mall_order_id: order.id,
    },
    data: {
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      address_line1: props.body.address_line1,
      address_line2: props.body.address_line2 ?? undefined,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postal_code,
      country: props.body.country,
      phone: props.body.phone,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: shipping.id,
    shopping_mall_order_id: shipping.shopping_mall_order_id,
    shopping_mall_shipping_method_id: shipping.shopping_mall_shipping_method_id,
    first_name: shipping.first_name,
    last_name: shipping.last_name,
    address_line1: shipping.address_line1,
    address_line2: shipping.address_line2 ?? undefined,
    city: shipping.city,
    state: shipping.state,
    postal_code: shipping.postal_code,
    country: shipping.country,
    phone: shipping.phone,
    carrier: shipping.carrier ?? undefined,
    tracking_number: shipping.tracking_number ?? undefined,
    tracking_url: shipping.tracking_url ?? undefined,
    estimated_delivery_date: shipping.estimated_delivery_date
      ? toISOStringSafe(shipping.estimated_delivery_date)
      : undefined,
    real_delivery_date: shipping.real_delivery_date
      ? toISOStringSafe(shipping.real_delivery_date)
      : undefined,
    created_at: toISOStringSafe(shipping.created_at),
    updated_at: toISOStringSafe(shipping.updated_at),
  };
}
