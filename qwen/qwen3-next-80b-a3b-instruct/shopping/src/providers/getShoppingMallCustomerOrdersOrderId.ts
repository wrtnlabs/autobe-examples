import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: ShoppingMallOrderTransformer.select().select,
  });
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: props.orderId },
    select: {
      id: true,
      shopping_mall_product_snapshot_id: true,
      shopping_mall_product_variant_snapshot_id: true,
      shopping_mall_seller_id: true,
      price_at_time_of_purchase: true,
      quantity: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: { order_id: props.orderId },
    select: {
      id: true,
      carrier_name: true,
      tracking_number: true,
      shipped_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  const statusHistory =
    await MyGlobal.prisma.shopping_mall_order_status_histories.findMany({
      where: { order_id: props.orderId },
      orderBy: { timestamp: "asc" },
      select: {
        id: true,
        old_status: true,
        new_status: true,
        changed_by: true,
        reason: true,
        timestamp: true,
      },
    });
  return {
    id: order.id,
    total_price: Number(order.total_price),
    status: order.status as
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | "partially_completed",
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer_id: order.customer.id,
    shipping_address_id: order.shippingAddress.id,
    items: JSON.stringify(
      items.map((item) => ({
        id: item.id,
        product_snapshot_id: item.shopping_mall_product_snapshot_id,
        variant_snapshot_id: item.shopping_mall_product_variant_snapshot_id,
        seller_id: item.shopping_mall_seller_id,
        price: Number(item.price_at_time_of_purchase),
        quantity: item.quantity,
        status: item.status as
          | "pending"
          | "confirmed"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      })),
    ),
    shipments: JSON.stringify(
      shipments.map((shipment) => ({
        id: shipment.id,
        carrier: shipment.carrier_name,
        tracking_number: shipment.tracking_number,
        shipped_at: shipment.shipped_at
          ? toISOStringSafe(shipment.shipped_at)
          : null,
        delivered_at: null,
        created_at: toISOStringSafe(shipment.created_at),
        updated_at: toISOStringSafe(shipment.updated_at),
      })),
    ),
    statusHistory: JSON.stringify(
      statusHistory.map((history) => ({
        id: history.id,
        old_status: history.old_status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded"
          | "partially_completed",
        new_status: history.new_status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded"
          | "partially_completed",
        actor: history.changed_by as "customer" | "seller" | "admin",
        reason: history.reason,
        created_at: toISOStringSafe(history.timestamp),
      })),
    ),
  };
}
