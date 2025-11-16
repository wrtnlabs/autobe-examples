import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  if (shipment.created_by_seller_id !== props.seller.id)
    throw new HttpException(
      "You are not authorized to update this shipment",
      403,
    );
  const allowedTransitions: Record<string, string[]> = {
    pending: ["ready", "cancelled"],
    ready: ["picked_up", "cancelled"],
    picked_up: ["in_transit", "cancelled"],
    in_transit: ["delivered", "cancelled", "returned"],
    delivered: ["returned"],
    cancelled: [],
    returned: [],
  };
  const currentStatus = shipment.status;
  const nextStatus = props.body.status ?? currentStatus;
  if (nextStatus !== currentStatus) {
    const validNext = allowedTransitions[currentStatus];
    if (!validNext.includes(nextStatus)) {
      throw new HttpException(
        `Invalid status transition from '${currentStatus}' to '${nextStatus}'`,
        400,
      );
    }
  }
  if (nextStatus === "delivered" && !props.body.delivery_at)
    throw new HttpException(
      "delivery_at timestamp must be set for delivered status",
      400,
    );
  if (nextStatus === "cancelled" && !props.body.cancelled_at)
    throw new HttpException(
      "cancelled_at timestamp must be set for cancelled status",
      400,
    );
  if (props.body.updated_by_admin_id)
    throw new HttpException("Seller cannot attribute update to admin", 400);
  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier_tracking_code: Object.prototype.hasOwnProperty.call(
        props.body,
        "carrier_tracking_code",
      )
        ? props.body.carrier_tracking_code
        : shipment.carrier_tracking_code,
      status: nextStatus,
      manifest_url: Object.prototype.hasOwnProperty.call(
        props.body,
        "manifest_url",
      )
        ? props.body.manifest_url
        : shipment.manifest_url,
      provider_response_code: Object.prototype.hasOwnProperty.call(
        props.body,
        "provider_response_code",
      )
        ? props.body.provider_response_code
        : shipment.provider_response_code,
      delivery_at:
        nextStatus === "delivered"
          ? props.body.delivery_at
          : shipment.delivery_at,
      cancelled_at:
        nextStatus === "cancelled"
          ? props.body.cancelled_at
          : shipment.cancelled_at,
      updated_at: (() => {
        const now = new Date();
        return toISOStringSafe(now);
      })(),
    },
  });
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: updated.order_id },
    select: {
      id: true,
      order_number: true,
      status: true,
      total_amount: true,
      currency: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: updated.order_item_id },
    select: {
      id: true,
      shopping_mall_order_id: true,
      quantity: true,
      unit_price: true,
      subtotal: true,
      currency: true,
      delivered: true,
      refunded: true,
      created_at: true,
      updated_at: true,
    },
  });
  let skuSummary = undefined;
  if (orderItem) {
    skuSummary = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: (orderItem as any).shopping_mall_product_sku_id },
      select: { id: true }, // removed in_stock field
    });
  }
  const shippingPartner = updated.shipping_partner_id
    ? await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
        where: { id: updated.shipping_partner_id },
        select: {
          id: true,
          partner_name: true,
          partner_code: true,
          status: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      })
    : undefined;
  const sellerSummary = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { id: true, business_name: true },
  });
  let adminSummary = undefined;
  if (updated.created_by_admin_id) {
    adminSummary = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: updated.created_by_admin_id },
      select: { id: true, name: true, email: true },
    });
  }
  function dateToStringOrUndefined(
    x: Date | string | null | undefined,
  ): (string & tags.Format<"date-time">) | undefined {
    if (x == null) return undefined;
    return typeof x === "string"
      ? (x as string & tags.Format<"date-time">)
      : (toISOStringSafe(x) as string & tags.Format<"date-time">);
  }
  return {
    id: updated.id,
    order: order
      ? {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_amount: order.total_amount,
          currency: order.currency,
          created_at: dateToStringOrUndefined(order.created_at)!,
          updated_at: dateToStringOrUndefined(order.updated_at)!,
          deleted_at: dateToStringOrUndefined(order.deleted_at),
        }
      : ({} as any), // force as ISummary
    orderItem:
      orderItem && skuSummary
        ? {
            id: orderItem.id,
            shopping_mall_order_id: orderItem.shopping_mall_order_id,
            sku: skuSummary,
            quantity: orderItem.quantity,
            unit_price: orderItem.unit_price,
            subtotal: orderItem.subtotal,
            currency: orderItem.currency,
            delivered: orderItem.delivered,
            refunded: orderItem.refunded,
            created_at: dateToStringOrUndefined(orderItem.created_at)!,
            updated_at: dateToStringOrUndefined(orderItem.updated_at)!,
          }
        : ({} as any),
    shippingPartner: shippingPartner
      ? {
          id: shippingPartner.id,
          partner_name: shippingPartner.partner_name,
          partner_code: shippingPartner.partner_code,
          status: shippingPartner.status,
          description: shippingPartner.description,
          created_at: dateToStringOrUndefined(shippingPartner.created_at)!,
          updated_at: dateToStringOrUndefined(shippingPartner.updated_at)!,
          deleted_at: dateToStringOrUndefined(shippingPartner.deleted_at),
        }
      : ({} as any),
    carrier_tracking_code:
      typeof updated.carrier_tracking_code === "string"
        ? updated.carrier_tracking_code
        : updated.carrier_tracking_code == null
          ? undefined
          : String(updated.carrier_tracking_code),
    status: updated.status as IShoppingMallShipment["status"],
    manifest_url:
      typeof updated.manifest_url === "string"
        ? updated.manifest_url
        : updated.manifest_url == null
          ? undefined
          : String(updated.manifest_url),
    provider_response_code:
      typeof updated.provider_response_code === "string"
        ? updated.provider_response_code
        : updated.provider_response_code == null
          ? undefined
          : String(updated.provider_response_code),
    createdByAdmin: adminSummary
      ? {
          id: adminSummary.id,
          name: adminSummary.name,
          email: adminSummary.email,
        }
      : undefined,
    createdBySeller: sellerSummary
      ? { id: sellerSummary.id, business_name: sellerSummary.business_name }
      : undefined,
    created_at: dateToStringOrUndefined(updated.created_at)!,
    updated_at: dateToStringOrUndefined(updated.updated_at)!,
    delivery_at: dateToStringOrUndefined(updated.delivery_at),
    cancelled_at: dateToStringOrUndefined(updated.cancelled_at),
  };
}
