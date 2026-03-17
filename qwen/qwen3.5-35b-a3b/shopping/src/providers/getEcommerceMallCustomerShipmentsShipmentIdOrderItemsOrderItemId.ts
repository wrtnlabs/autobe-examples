import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentsOrderItem> {
  const junction =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findUniqueOrThrow(
      {
        where: {
          ecommerce_mall_shipment_id_ecommerce_mall_order_item_id: {
            ecommerce_mall_shipment_id: props.shipmentId,
            ecommerce_mall_order_item_id: props.orderItemId,
          },
        },
      },
    );
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: junction.ecommerce_mall_shipment_id },
    });
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: shipment.ecommerce_mall_order_id },
    include: {
      customer: true,
      shippingAddress: true,
    },
  });
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: junction.ecommerce_mall_order_item_id },
      select: {
        product_name: true,
        product_sku: true,
        variant_name: true,
        unit_price: true,
        total_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const orderCustomerId = order.customer_id;
  const shipmentSellerId = shipment.ecommerce_mall_seller_id;
  if (
    orderCustomerId !== props.customer.id &&
    shipmentSellerId !== props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const shippingAddress = order.shippingAddress;
  return {
    id: junction.id,
    quantity: junction.shipped_quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
    product_name: orderItem.product_name,
    product_sku: orderItem.product_sku,
    variant_name: orderItem.variant_name,
    shipment: {
      id: shipment.id,
      carrierName:
        shipment.carrier_name === null ? undefined : shipment.carrier_name,
      carrierPhone:
        shipment.carrier_phone === null ? undefined : shipment.carrier_phone,
      carrierWebsite:
        shipment.carrier_website === null
          ? undefined
          : shipment.carrier_website,
      status: shipment.status,
      shippedAt:
        shipment.shipped_at === null
          ? undefined
          : toISOStringSafe(shipment.shipped_at),
      deliveredAt:
        shipment.delivered_at === null
          ? undefined
          : toISOStringSafe(shipment.delivered_at),
      estimatedDeliveryAt:
        shipment.estimated_delivery_at === null
          ? undefined
          : toISOStringSafe(shipment.estimated_delivery_at),
      order: {
        id: order.id,
        order_number: order.order_number,
        total_price: order.total_price,
        status: order.status,
        shipping_address: {
          id: shippingAddress.id,
          recipient_name: shippingAddress.recipient_name,
          recipient_phone: shippingAddress.recipient_phone,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          is_default: shippingAddress.is_default,
          created_at: toISOStringSafe(shippingAddress.created_at),
          updated_at: toISOStringSafe(shippingAddress.updated_at),
          deleted_at:
            shippingAddress.deleted_at === null
              ? null
              : toISOStringSafe(shippingAddress.deleted_at),
        },
        created_at: toISOStringSafe(order.created_at),
        deleted_at:
          order.deleted_at === null ? null : toISOStringSafe(order.deleted_at),
      },
      trackingCount: 0,
    } satisfies IEcommerceMallShipment.ISummary,
    order: {
      id: order.id,
      order_number: order.order_number,
      total_price: order.total_price,
      status: order.status,
      shipping_address: {
        id: shippingAddress.id,
        recipient_name: shippingAddress.recipient_name,
        recipient_phone: shippingAddress.recipient_phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        is_default: shippingAddress.is_default,
        created_at: toISOStringSafe(shippingAddress.created_at),
        updated_at: toISOStringSafe(shippingAddress.updated_at),
        deleted_at:
          shippingAddress.deleted_at === null
            ? null
            : toISOStringSafe(shippingAddress.deleted_at),
      },
      created_at: toISOStringSafe(order.created_at),
      deleted_at:
        order.deleted_at === null ? null : toISOStringSafe(order.deleted_at),
    } satisfies IEcommerceMallOrder.ISummary,
  } satisfies IEcommerceMallShipmentsOrderItem;
}
