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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string;
}): Promise<IShoppingMallOrder> {
  // Find the order with all related items
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    include: {
      orderItems: {
        where: { deleted_at: null },
        include: {
          product: true,
          productVariant: true,
          shipment: {
            include: {
              seller: true,
            },
          },
        },
      },
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Authorization: customer must own the order
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform order items to response format
  const items = order.orderItems.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: item.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    shopping_mall_product_id: item.shopping_mall_product_id as string &
      tags.Format<"uuid">,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id as string & tags.Format<"uuid">,
    quantity: item.quantity,
    price: item.price,
    status: item.status,
    subtotal: item.subtotal,
    product_name: item.product_name,
    variant_options: item.variant_options,
    product_image_url: item.product_image_url,
    seller_profile_snapshot_id: item.seller_profile_snapshot_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));
  // Transform shipment if exists
  const shipment = order.orderItems[0]?.shipment
    ? {
        id: order.orderItems[0].shipment.id as string & tags.Format<"uuid">,
        shopping_mall_order_item_id: order.orderItems[0].shipment
          .shopping_mall_order_item_id as string & tags.Format<"uuid">,
        shopping_mall_sellers_id: order.orderItems[0].shipment
          .shopping_mall_sellers_id as string & tags.Format<"uuid">,
        carrier_name: order.orderItems[0].shipment.carrier_name,
        tracking_number: order.orderItems[0].shipment.tracking_number,
        status: order.orderItems[0].shipment.status,
        shipped_at: order.orderItems[0].shipment.shipped_at
          ? toISOStringSafe(order.orderItems[0].shipment.shipped_at)
          : null,
        delivered_at: order.orderItems[0].shipment.delivered_at
          ? toISOStringSafe(order.orderItems[0].shipment.delivered_at)
          : null,
        customer_confirmed_delivery:
          order.orderItems[0].shipment.customer_confirmed_delivery,
        shipping_address: order.orderItems[0].shipment.shipping_address,
        created_at: toISOStringSafe(order.orderItems[0].shipment.created_at),
        updated_at: toISOStringSafe(order.orderItems[0].shipment.updated_at),
        seller: {
          id: order.orderItems[0].shipment.seller.id as string &
            tags.Format<"uuid">,
          email: order.orderItems[0].shipment.seller.email,
          shop_name: order.orderItems[0].shipment.seller.shop_name,
          shop_description:
            order.orderItems[0].shipment.seller.shop_description,
          logo_image_id: order.orderItems[0].shipment.seller.logo_image_id,
          status: order.orderItems[0].shipment.seller.status,
          rejection_reason:
            order.orderItems[0].shipment.seller.rejection_reason,
          created_at: toISOStringSafe(
            order.orderItems[0].shipment.seller.created_at,
          ),
          updated_at: toISOStringSafe(
            order.orderItems[0].shipment.seller.updated_at,
          ),
          deleted_at: order.orderItems[0].shipment.seller.deleted_at
            ? toISOStringSafe(order.orderItems[0].shipment.seller.deleted_at)
            : null,
        },
      }
    : null;
  return {
    id: order.id as string & tags.Format<"uuid">,
    shopping_mall_customer_id: order.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    order_status: order.order_status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    orderItems: items,
    shipment: shipment,
  };
}
