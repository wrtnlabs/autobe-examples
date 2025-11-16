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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderNumberShipmentsShipmentId(props: {
  customer: CustomerPayload;
  orderNumber: string;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipment> {
  // Step 1: Find the order by orderNumber, customer ownership, not soft deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Step 2: Find the shipment by id, ensure it is for the given order and not soft deleted
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

  // Step 3: Find the shipping partner
  const partner =
    await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
      where: {
        id: shipment.shopping_mall_shipping_partner_id,
      },
    });
  if (!partner) {
    throw new HttpException("Shipping partner not found", 500);
  }

  // Compose summary objects as required by DTOs
  const orderSummary = {
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
  };

  const partnerSummary = {
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
  };

  // Build and return the response DTO, matching all null/undefined/required DTO rules
  return {
    id: shipment.id,
    order: orderSummary,
    shippingPartner: partnerSummary,
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    ship_date: shipment.ship_date ? toISOStringSafe(shipment.ship_date) : null,
    expected_delivery_date: shipment.expected_delivery_date
      ? toISOStringSafe(shipment.expected_delivery_date)
      : null,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : undefined,
  };
}
