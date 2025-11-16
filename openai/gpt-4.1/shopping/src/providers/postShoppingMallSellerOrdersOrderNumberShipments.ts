import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderNumberShipments(props: {
  seller: SellerPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipment.ICreate;
}): Promise<IShoppingMallOrderShipment> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or not accessible by seller.",
      404,
    );
  }

  const shippingPartner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
      where: {
        id: props.body.shipping_partner_id,
        deleted_at: null,
      },
    });
  if (!shippingPartner) {
    throw new HttpException("Shipping partner does not exist.", 400);
  }

  const existingTracking =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        tracking_number: props.body.tracking_number,
      },
    });
  if (existingTracking) {
    throw new HttpException(
      "Tracking number already used on another shipment.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const shipment = await MyGlobal.prisma.shopping_mall_order_shipments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: order.id,
      shopping_mall_shipping_partner_id: props.body.shipping_partner_id,
      tracking_number: props.body.tracking_number,
      status: props.body.status,
      ship_date: props.body.ship_date ?? null,
      expected_delivery_date: props.body.expected_delivery_date ?? null,
      created_at: now,
      updated_at: now,
      delivered_at: null,
      deleted_at: null,
    },
  });

  return {
    id: shipment.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at
        ? toISOStringSafe(order.deleted_at)
        : undefined,
    },
    shippingPartner: {
      id: shippingPartner.id,
      partner_name: shippingPartner.partner_name,
      partner_code: shippingPartner.partner_code,
      status: shippingPartner.status,
      description: shippingPartner.description,
      created_at: toISOStringSafe(shippingPartner.created_at),
      updated_at: toISOStringSafe(shippingPartner.updated_at),
      deleted_at: shippingPartner.deleted_at
        ? toISOStringSafe(shippingPartner.deleted_at)
        : undefined,
    },
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    ship_date: shipment.ship_date
      ? toISOStringSafe(shipment.ship_date)
      : undefined,
    expected_delivery_date: shipment.expected_delivery_date
      ? toISOStringSafe(shipment.expected_delivery_date)
      : undefined,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : undefined,
  };
}
