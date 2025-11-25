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

export async function putShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  // Verify the order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Verify the shipment exists and belongs to the order
  const existingShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUnique({
      where: { id: props.shipmentId },
    });

  if (!existingShipment) {
    throw new HttpException("Shipment not found", 404);
  }

  if (existingShipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      400,
    );
  }

  // Validate status transitions - cannot revert from delivered status
  if (
    existingShipment.status === "delivered" &&
    props.body.status &&
    props.body.status !== "delivered"
  ) {
    throw new HttpException("Cannot change status from delivered", 400);
  }

  // Check for duplicate tracking number if provided
  if (
    props.body.tracking_number &&
    props.body.tracking_number !== existingShipment.tracking_number
  ) {
    const duplicateShipment =
      await MyGlobal.prisma.shopping_mall_shipments.findFirst({
        where: {
          tracking_number: props.body.tracking_number,
          id: { not: props.shipmentId },
        },
      });

    if (duplicateShipment) {
      throw new HttpException("Tracking number already exists", 400);
    }
  }

  // Build update data with proper typing
  const updateData: {
    carrier?: string;
    tracking_number?: string;
    shipping_method?: string;
    shipping_cost?: number;
    status?: string;
    estimated_delivery?: Date | null;
    actual_delivery?: Date | null;
    shipping_label_url?: string | null;
    tracking_url?: string | null;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Add provided fields to update
  if (props.body.carrier !== undefined) updateData.carrier = props.body.carrier;
  if (props.body.tracking_number !== undefined)
    updateData.tracking_number = props.body.tracking_number;
  if (props.body.shipping_method !== undefined)
    updateData.shipping_method = props.body.shipping_method;
  if (props.body.shipping_cost !== undefined)
    updateData.shipping_cost = props.body.shipping_cost;
  if (props.body.status !== undefined) updateData.status = props.body.status;

  // Handle date conversions properly
  if (props.body.estimated_delivery !== undefined) {
    updateData.estimated_delivery = props.body.estimated_delivery
      ? new Date(props.body.estimated_delivery)
      : null;
  }

  if (props.body.actual_delivery !== undefined) {
    updateData.actual_delivery = props.body.actual_delivery
      ? new Date(props.body.actual_delivery)
      : null;
  }

  if (props.body.shipping_label_url !== undefined) {
    updateData.shipping_label_url = props.body.shipping_label_url ?? null;
  }

  if (props.body.tracking_url !== undefined) {
    updateData.tracking_url = props.body.tracking_url ?? null;
  }

  // Update the shipment
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: updateData,
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
    id: updatedShipment.id,
    order: {
      id: updatedShipment.order.id,
      order_number: updatedShipment.order.order_number,
      total_amount: updatedShipment.order.total_amount,
      subtotal_amount: updatedShipment.order.subtotal_amount,
      tax_amount: updatedShipment.order.tax_amount,
      shipping_amount: updatedShipment.order.shipping_amount,
      currency: updatedShipment.order.currency,
      status: updatedShipment.order.status,
      shipping_address: updatedShipment.order.shipping_address,
      billing_address: updatedShipment.order.billing_address,
      created_at: toISOStringSafe(updatedShipment.order.created_at),
      updated_at: toISOStringSafe(updatedShipment.order.updated_at),
      customer: {
        id: updatedShipment.order.customer.id,
        email: updatedShipment.order.customer.email,
        first_name: updatedShipment.order.customer.first_name,
        last_name: updatedShipment.order.customer.last_name,
        phone_number: updatedShipment.order.customer.phone_number ?? undefined,
        status: updatedShipment.order.customer.status,
        created_at: toISOStringSafe(updatedShipment.order.customer.created_at),
        updated_at: updatedShipment.order.customer.updated_at
          ? toISOStringSafe(updatedShipment.order.customer.updated_at)
          : undefined,
      },
    },
    carrier: updatedShipment.carrier,
    tracking_number: updatedShipment.tracking_number,
    shipping_method: updatedShipment.shipping_method,
    shipping_cost: updatedShipment.shipping_cost,
    status: updatedShipment.status,
    estimated_delivery: updatedShipment.estimated_delivery
      ? toISOStringSafe(updatedShipment.estimated_delivery)
      : undefined,
    actual_delivery: updatedShipment.actual_delivery
      ? toISOStringSafe(updatedShipment.actual_delivery)
      : undefined,
    shipping_label_url: updatedShipment.shipping_label_url ?? undefined,
    tracking_url: updatedShipment.tracking_url ?? undefined,
    created_at: toISOStringSafe(updatedShipment.created_at),
    updated_at: toISOStringSafe(updatedShipment.updated_at),
  };
}
