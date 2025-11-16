import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerReturnRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallReturnRequest.ICreate;
}): Promise<IShoppingMallReturnRequest> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { id: props.body.order_id, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.body.order_item_id,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Order does not belong to this seller", 403);
  }
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: orderItem.shopping_mall_product_sku_id },
  });
  const now = toISOStringSafe(new Date());
  const newId = v4();
  const created = await MyGlobal.prisma.shopping_mall_return_requests.create({
    data: {
      id: newId,
      order_id: props.body.order_id,
      order_item_id: props.body.order_item_id,
      reason: props.body.reason,
      status: "pending",
      pickup_address: props.body.pickup_address ?? null,
      scheduled_pickup_at: props.body.scheduled_pickup_at ?? null,
      provider_tracking_code: props.body.provider_tracking_code ?? null,
      shipping_partner_id: props.body.shipping_partner_id ?? null,
      requested_by_seller_id: props.seller.id,
      requested_by_customer_id: null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      cancelled_at: null,
      deleted_at: null,
    },
  });
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: order.shopping_mall_seller_id },
  });
  let shippingPartnerSummary = undefined;
  if (created.shipping_partner_id) {
    const shippingPartner =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
        where: { id: created.shipping_partner_id },
      });
    if (shippingPartner) {
      shippingPartnerSummary = {
        id: shippingPartner.id,
        partner_name: shippingPartner.partner_name,
        partner_code: shippingPartner.partner_code,
        status: shippingPartner.status,
        description: shippingPartner.description,
        created_at: toISOStringSafe(shippingPartner.created_at),
        updated_at: toISOStringSafe(shippingPartner.updated_at),
        deleted_at: shippingPartner.deleted_at
          ? toISOStringSafe(shippingPartner.deleted_at)
          : undefined,
      };
    }
  }
  return {
    id: created.id,
    order: {
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
    },
    orderItem: {
      id: orderItem.id,
      shopping_mall_order_id: orderItem.shopping_mall_order_id,
      sku: sku
        ? {
            id: sku.id,
            code: sku.sku_code,
            product_title: "",
            option_summary: "",
            in_stock: sku.stock > 0,
          }
        : {
            id: orderItem.shopping_mall_product_sku_id,
            code: "",
            product_title: "",
            option_summary: "",
            in_stock: true,
          },
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      subtotal: orderItem.subtotal,
      currency: orderItem.currency,
      delivered: orderItem.delivered,
      refunded: orderItem.refunded,
      created_at: toISOStringSafe(orderItem.created_at),
      updated_at: toISOStringSafe(orderItem.updated_at),
    },
    requestedByCustomer: null,
    requestedBySeller: seller
      ? { id: seller.id, business_name: seller.business_name }
      : undefined,
    shippingPartner: shippingPartnerSummary,
    reason: created.reason,
    status: created.status,
    pickup_address: created.pickup_address ?? null,
    scheduled_pickup_at: created.scheduled_pickup_at
      ? toISOStringSafe(created.scheduled_pickup_at)
      : created.scheduled_pickup_at,
    provider_tracking_code: created.provider_tracking_code ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : created.completed_at,
    cancelled_at: created.cancelled_at
      ? toISOStringSafe(created.cancelled_at)
      : created.cancelled_at,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : created.deleted_at,
  };
}
