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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Verify the order exists and is in a shippable state
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    include: {
      customer: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Check if order is in a shippable state
  const shippableStatuses = ["confirmed", "processing"];
  if (!shippableStatuses.includes(order.status)) {
    throw new HttpException("Order is not in a shippable state", 400);
  }

  const now = toISOStringSafe(new Date());

  // Create the shipment
  const createdShipment = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.orderId,
      carrier: props.body.carrier,
      tracking_number: props.body.tracking_number,
      shipping_method: props.body.shipping_method,
      shipping_cost: props.body.shipping_cost,
      status: props.body.status ?? "label_created",
      estimated_delivery: props.body.estimated_delivery
        ? new Date(props.body.estimated_delivery)
        : null,
      actual_delivery: null,
      shipping_label_url: props.body.shipping_label_url ?? null,
      tracking_url: props.body.tracking_url ?? null,
      created_at: new Date(now),
      updated_at: new Date(now),
    },
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
  });

  // Convert to API response format
  return {
    id: createdShipment.id as string & tags.Format<"uuid">,
    order: {
      id: createdShipment.order.id as string & tags.Format<"uuid">,
      order_number: createdShipment.order.order_number,
      total_amount: createdShipment.order.total_amount,
      subtotal_amount: createdShipment.order.subtotal_amount,
      tax_amount: createdShipment.order.tax_amount,
      shipping_amount: createdShipment.order.shipping_amount,
      currency: createdShipment.order.currency,
      status: createdShipment.order.status,
      shipping_address: createdShipment.order.shipping_address,
      billing_address: createdShipment.order.billing_address,
      created_at: toISOStringSafe(createdShipment.order.created_at),
      updated_at: toISOStringSafe(createdShipment.order.updated_at),
      customer: {
        id: createdShipment.order.customer.id as string & tags.Format<"uuid">,
        email: createdShipment.order.customer.email as string &
          tags.Format<"email">,
        first_name: createdShipment.order.customer.first_name,
        last_name: createdShipment.order.customer.last_name,
        phone_number: createdShipment.order.customer.phone_number ?? undefined,
        status: createdShipment.order.customer.status,
        created_at: toISOStringSafe(createdShipment.order.customer.created_at),
        updated_at: createdShipment.order.customer.updated_at
          ? toISOStringSafe(createdShipment.order.customer.updated_at)
          : undefined,
      },
    },
    carrier: createdShipment.carrier,
    tracking_number: createdShipment.tracking_number,
    shipping_method: createdShipment.shipping_method,
    shipping_cost: createdShipment.shipping_cost,
    status: createdShipment.status,
    estimated_delivery: createdShipment.estimated_delivery
      ? toISOStringSafe(createdShipment.estimated_delivery)
      : undefined,
    actual_delivery: undefined,
    shipping_label_url: createdShipment.shipping_label_url ?? undefined,
    tracking_url: createdShipment.tracking_url ?? undefined,
    created_at: toISOStringSafe(createdShipment.created_at),
    updated_at: toISOStringSafe(createdShipment.updated_at),
  };
}
