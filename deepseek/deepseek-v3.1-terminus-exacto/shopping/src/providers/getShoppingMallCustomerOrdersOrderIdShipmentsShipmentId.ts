import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdShipmentsShipmentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // First verify the order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Then verify the shipment exists and belongs to the order
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shopping_mall_order_id: props.orderId,
    },
  });

  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // Build the response with proper type conversions
  return {
    id: shipment.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      subtotal_amount: order.subtotal_amount,
      tax_amount: order.tax_amount,
      shipping_amount: order.shipping_amount,
      currency: order.currency,
      status: order.status,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        phone_number: order.customer.phone_number ?? undefined,
        status: order.customer.status,
        created_at: toISOStringSafe(order.customer.created_at),
        updated_at: order.customer.updated_at
          ? toISOStringSafe(order.customer.updated_at)
          : undefined,
      },
    },
    carrier: shipment.carrier,
    tracking_number: shipment.tracking_number,
    shipping_method: shipment.shipping_method,
    shipping_cost: shipment.shipping_cost,
    status: shipment.status,
    estimated_delivery: shipment.estimated_delivery
      ? toISOStringSafe(shipment.estimated_delivery)
      : undefined,
    actual_delivery: shipment.actual_delivery
      ? toISOStringSafe(shipment.actual_delivery)
      : undefined,
    shipping_label_url: shipment.shipping_label_url ?? undefined,
    tracking_url: shipment.tracking_url ?? undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
  };
}
