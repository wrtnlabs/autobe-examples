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

export async function putShoppingMallSellerOrdersOrderNumberShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderNumber: string;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IUpdate;
}): Promise<IShoppingMallOrderShipment> {
  // Find the order by business order number and ensure ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or not owned by seller", 404);
  }

  // Find the shipment linked to the order and not soft-deleted
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found for order", 404);
  }

  // If tracking_number provided & changed, enforce uniqueness
  if (
    typeof props.body.tracking_number === "string" &&
    props.body.tracking_number !== shipment.tracking_number
  ) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
        where: {
          tracking_number: props.body.tracking_number,
        },
      });
    if (duplicate) {
      throw new HttpException("Tracking number already in use", 409);
    }
  }

  // If shipping partner provided, validate existence
  if (props.body.shopping_mall_shipping_partner_id) {
    const partnerExists =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
        where: {
          id: props.body.shopping_mall_shipping_partner_id,
          deleted_at: null,
        },
      });
    if (!partnerExists) {
      throw new HttpException("Shipping partner not found", 404);
    }
  }

  // Only update mutable fields; system/immutable excluded
  const updated = await MyGlobal.prisma.shopping_mall_order_shipments.update({
    where: { id: props.shipmentId },
    data: {
      // Only set provided updatable fields
      ...(props.body.shopping_mall_shipping_partner_id !== undefined && {
        shopping_mall_shipping_partner_id:
          props.body.shopping_mall_shipping_partner_id,
      }),
      ...(props.body.tracking_number !== undefined && {
        tracking_number: props.body.tracking_number,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.ship_date !== undefined && {
        ship_date: props.body.ship_date ?? null,
      }),
      ...(props.body.expected_delivery_date !== undefined && {
        expected_delivery_date: props.body.expected_delivery_date ?? null,
      }),
      ...(props.body.delivered_at !== undefined && {
        delivered_at: props.body.delivered_at ?? null,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Fetch the associated order and shipping partner summary for return value
  const [orderSummary, shippingPartnerSummary] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: updated.shopping_mall_order_id },
    }),
    MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
      where: { id: updated.shopping_mall_shipping_partner_id },
    }),
  ]);

  if (!orderSummary) {
    throw new HttpException("Order summary not found", 500);
  }
  if (!shippingPartnerSummary) {
    throw new HttpException("Shipping partner summary not found", 500);
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
      id: shippingPartnerSummary.id,
      partner_name: shippingPartnerSummary.partner_name,
      partner_code: shippingPartnerSummary.partner_code,
      status: shippingPartnerSummary.status,
      description: shippingPartnerSummary.description,
      created_at: toISOStringSafe(shippingPartnerSummary.created_at),
      updated_at: toISOStringSafe(shippingPartnerSummary.updated_at),
      deleted_at: shippingPartnerSummary.deleted_at
        ? toISOStringSafe(shippingPartnerSummary.deleted_at)
        : undefined,
    },
    tracking_number: updated.tracking_number,
    status: updated.status,
    ship_date: updated.ship_date
      ? toISOStringSafe(updated.ship_date)
      : undefined,
    expected_delivery_date: updated.expected_delivery_date
      ? toISOStringSafe(updated.expected_delivery_date)
      : undefined,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
