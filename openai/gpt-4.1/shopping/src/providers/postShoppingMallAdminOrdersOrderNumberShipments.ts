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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderNumberShipments(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderShipment.ICreate;
}): Promise<IShoppingMallOrderShipment> {
  // 1. Find the order by orderNumber and not soft-deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or deleted", 404);
  }
  // 2. Find the shipping partner, not deleted and active
  const partner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
      where: {
        id: props.body.shipping_partner_id,
        deleted_at: null,
        status: "active",
      },
    });
  if (!partner) {
    throw new HttpException("Shipping partner not found or not active", 404);
  }
  // 3. Check for unique tracking_number in shipments (not soft-deleted)
  const exists = await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
    where: {
      tracking_number: props.body.tracking_number,
      deleted_at: null,
    },
  });
  if (exists) {
    throw new HttpException(
      "Tracking number already used for another shipment",
      409,
    );
  }
  // 4. Create the shipment
  const now = toISOStringSafe(new Date());
  const shipment = await MyGlobal.prisma.shopping_mall_order_shipments.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      shopping_mall_shipping_partner_id: props.body.shipping_partner_id,
      tracking_number: props.body.tracking_number,
      status: props.body.status,
      ship_date: props.body.ship_date ?? null,
      expected_delivery_date: props.body.expected_delivery_date ?? null,
      delivered_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Return API structure (with order & partner summary)
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
      deleted_at:
        order.deleted_at !== null && order.deleted_at !== undefined
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
      deleted_at:
        partner.deleted_at !== null && partner.deleted_at !== undefined
          ? toISOStringSafe(partner.deleted_at)
          : undefined,
    },
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    ship_date:
      shipment.ship_date !== null && shipment.ship_date !== undefined
        ? toISOStringSafe(shipment.ship_date)
        : undefined,
    expected_delivery_date:
      shipment.expected_delivery_date !== null &&
      shipment.expected_delivery_date !== undefined
        ? toISOStringSafe(shipment.expected_delivery_date)
        : undefined,
    delivered_at:
      shipment.delivered_at !== null && shipment.delivered_at !== undefined
        ? toISOStringSafe(shipment.delivered_at)
        : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at:
      shipment.deleted_at !== null && shipment.deleted_at !== undefined
        ? toISOStringSafe(shipment.deleted_at)
        : undefined,
  };
}
