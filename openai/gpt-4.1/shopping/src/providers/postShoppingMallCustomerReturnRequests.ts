import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReturnRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallReturnRequest.ICreate;
}): Promise<IShoppingMallReturnRequest> {
  const now = toISOStringSafe(new Date());
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.order_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or does not belong to this customer",
      404,
    );
  }
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.body.order_item_id,
      shopping_mall_order_id: props.body.order_id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order item not found or does not belong to specified order",
      404,
    );
  }
  // Fetch the SKU for the order item
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: { id: orderItem.shopping_mall_product_sku_id },
  });
  if (!sku) {
    throw new HttpException("SKU not found for the given order item", 404);
  }
  // Create return request
  const created = await MyGlobal.prisma.shopping_mall_return_requests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: props.body.order_id,
      order_item_id: props.body.order_item_id,
      requested_by_customer_id: props.customer.id,
      requested_by_seller_id: null,
      shipping_partner_id: props.body.shipping_partner_id ?? null,
      reason: props.body.reason,
      status: "pending",
      pickup_address: Object.prototype.hasOwnProperty.call(
        props.body,
        "pickup_address",
      )
        ? (props.body.pickup_address ?? null)
        : null,
      scheduled_pickup_at: Object.prototype.hasOwnProperty.call(
        props.body,
        "scheduled_pickup_at",
      )
        ? (props.body.scheduled_pickup_at ?? null)
        : null,
      provider_tracking_code: Object.prototype.hasOwnProperty.call(
        props.body,
        "provider_tracking_code",
      )
        ? (props.body.provider_tracking_code ?? null)
        : null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      cancelled_at: null,
      deleted_at: null,
    },
  });
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { id: props.customer.id },
  });
  let shippingPartner:
    | IShoppingMallShippingPartner.ISummary
    | null
    | undefined = null;
  if (created.shipping_partner_id) {
    const partner =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findFirst({
        where: { id: created.shipping_partner_id, deleted_at: null },
      });
    if (partner) {
      shippingPartner = {
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
    } else {
      shippingPartner = null;
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
      sku: {
        id: sku.id,
        code: sku.sku_code,
        product_title: "", // cannot provide, not in schema
        option_summary: "", // cannot provide, not in schema
        in_stock: sku.stock > 0,
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
    requestedByCustomer: customer
      ? { id: customer.id, name: customer.name }
      : undefined,
    requestedBySeller: null,
    shippingPartner: shippingPartner ?? null,
    reason: created.reason,
    status: created.status,
    pickup_address: Object.prototype.hasOwnProperty.call(
      created,
      "pickup_address",
    )
      ? (created.pickup_address ?? null)
      : null,
    scheduled_pickup_at: Object.prototype.hasOwnProperty.call(
      created,
      "scheduled_pickup_at",
    )
      ? created.scheduled_pickup_at
        ? toISOStringSafe(created.scheduled_pickup_at)
        : null
      : null,
    provider_tracking_code: Object.prototype.hasOwnProperty.call(
      created,
      "provider_tracking_code",
    )
      ? (created.provider_tracking_code ?? null)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    cancelled_at: created.cancelled_at
      ? toISOStringSafe(created.cancelled_at)
      : null,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
