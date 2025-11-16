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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderNumberShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderNumber: string;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IUpdate;
}): Promise<IShoppingMallOrderShipment> {
  // 1. Resolve order and shipment existence, join by orderNumber/PK
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // 2. Build update data (only modifiable fields)
  const updateData: Record<string, unknown> = {};
  if (typeof props.body.shopping_mall_shipping_partner_id === "string") {
    updateData.shopping_mall_shipping_partner_id =
      props.body.shopping_mall_shipping_partner_id;
  }
  if (typeof props.body.tracking_number === "string") {
    if (props.body.tracking_number !== shipment.tracking_number) {
      // Ensure uniqueness, only if new value provided
      const dupe =
        await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
          where: { tracking_number: props.body.tracking_number },
        });
      if (dupe && dupe.id !== shipment.id) {
        throw new HttpException("Tracking number already assigned", 409);
      }
    }
    updateData.tracking_number = props.body.tracking_number;
  }
  if (typeof props.body.status === "string") {
    updateData.status = props.body.status;
  }
  if ("ship_date" in props.body) {
    updateData.ship_date =
      props.body.ship_date === undefined ? null : props.body.ship_date;
  }
  if ("expected_delivery_date" in props.body) {
    updateData.expected_delivery_date =
      props.body.expected_delivery_date === undefined
        ? null
        : props.body.expected_delivery_date;
  }
  if ("delivered_at" in props.body) {
    updateData.delivered_at =
      props.body.delivered_at === undefined ? null : props.body.delivered_at;
  }
  updateData.updated_at = toISOStringSafe(new Date());

  // 3. Update shipment
  const updated = await MyGlobal.prisma.shopping_mall_order_shipments.update({
    where: { id: props.shipmentId },
    data: updateData,
  });

  // 4. Fetch relations for API response (order summary, shipping partner summary)
  const orderSummary = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: updated.shopping_mall_order_id },
  });
  const partnerSummary =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { id: updated.shopping_mall_shipping_partner_id },
    });
  if (!orderSummary || !partnerSummary) {
    throw new HttpException("Related records not found", 500);
  }

  return {
    id: updated.id,
    order: {
      id: orderSummary.id,
      order_number: orderSummary.order_number,
      status: orderSummary.status,
      total_amount: orderSummary.total_amount,
      currency: orderSummary.currency,
      created_at: toISOStringSafe(orderSummary.created_at),
      updated_at: toISOStringSafe(orderSummary.updated_at),
      deleted_at: orderSummary.deleted_at
        ? toISOStringSafe(orderSummary.deleted_at)
        : undefined,
    },
    shippingPartner: {
      id: partnerSummary.id,
      partner_name: partnerSummary.partner_name,
      partner_code: partnerSummary.partner_code,
      status: partnerSummary.status,
      description: partnerSummary.description,
      created_at: toISOStringSafe(partnerSummary.created_at),
      updated_at: toISOStringSafe(partnerSummary.updated_at),
      deleted_at: partnerSummary.deleted_at
        ? toISOStringSafe(partnerSummary.deleted_at)
        : undefined,
    },
    tracking_number: updated.tracking_number,
    status: updated.status,
    ship_date: updated.ship_date
      ? toISOStringSafe(updated.ship_date)
      : updated.ship_date,
    expected_delivery_date: updated.expected_delivery_date
      ? toISOStringSafe(updated.expected_delivery_date)
      : updated.expected_delivery_date,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : updated.delivered_at,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
