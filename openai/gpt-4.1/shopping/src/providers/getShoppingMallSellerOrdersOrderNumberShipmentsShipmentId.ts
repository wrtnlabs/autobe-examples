import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getShoppingMallSellerOrdersOrderNumberShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderNumber: string;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipment> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found for this order", 404);
  }

  const partner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: {
        id: shipment.shopping_mall_shipping_partner_id,
      },
    });
  if (!partner) {
    throw new HttpException("Shipping partner not found", 404);
  }
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
      id: partner.id,
      partner_name: partner.partner_name,
      partner_code: partner.partner_code,
      status: partner.status,
      description: partner.description,
      created_at: toISOStringSafe(partner.created_at),
      updated_at: toISOStringSafe(partner.updated_at),
      deleted_at: partner.deleted_at
        ? toISOStringSafe(partner.deleted_at)
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
