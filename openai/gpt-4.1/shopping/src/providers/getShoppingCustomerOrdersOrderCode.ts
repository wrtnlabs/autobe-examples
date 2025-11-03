import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerOrdersOrderCode(props: {
  customer: CustomerPayload;
  orderCode: string;
}): Promise<IShoppingOrder> {
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: props.orderCode },
    include: {
      customer: true,
      shopping_order_lines: {
        include: {
          sku: true,
          seller: true,
          shopping_order_fulfillments: { include: { sellerAddress: true } },
        },
      },
      shopping_order_splits: {
        include: {
          seller: true,
          shopping_order_status_histories: true,
        },
      },
      shopping_order_addresses: true,
      shopping_order_status_histories: true,
      shopping_payment_attempts: true,
      shopping_shipments: { include: { seller: true } },
    },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.shopping_customer_id !== props.customer.id)
    throw new HttpException("Forbidden", 403);
  // Map customer summary
  const customerSummary = {
    id: order.customer.id,
    name: order.customer.name,
    email: order.customer.email,
    is_active: order.customer.is_active,
    created_at: toISOStringSafe(order.customer.created_at),
    deleted_at: order.customer.deleted_at
      ? toISOStringSafe(order.customer.deleted_at)
      : null,
  };
  // Order lines
  const orderLines = order.shopping_order_lines.map((line) => ({
    id: line.id,
    sku: {
      id: line.sku.id,
      sku_code: line.sku.sku_code,
      price: line.sku.price,
      is_active: line.sku.is_active,
      status: line.sku.status,
    },
    quantity: line.quantity,
    unit_price: line.unit_price,
    status: line.status,
    seller: {
      id: line.seller.id,
      display_name: line.seller.display_name,
      status: line.seller.status,
    },
    fulfillments:
      line.shopping_order_fulfillments?.map((f) => ({
        id: f.id,
        fulfillment_code: f.fulfillment_code,
        quantity_fulfilled: f.quantity_fulfilled,
        status: f.status,
        fulfilled_at: toISOStringSafe(f.fulfilled_at),
        seller_address_id: f.shopping_seller_address_id,
      })) ?? undefined,
    created_at: toISOStringSafe(line.created_at),
    updated_at: toISOStringSafe(line.updated_at),
    deleted_at: line.deleted_at ? toISOStringSafe(line.deleted_at) : undefined,
  }));
  // Order splits
  const orderSplits = order.shopping_order_splits.map((split) => ({
    id: split.id,
    split_code: split.split_code,
    subtotal_price: split.subtotal_price,
    status: split.status,
    created_at: toISOStringSafe(split.created_at),
    updated_at: split.updated_at
      ? toISOStringSafe(split.updated_at)
      : undefined,
    order_id: split.shopping_order_id,
    seller: {
      id: split.seller.id,
      display_name: split.seller.display_name,
      status: split.seller.status,
    },
    order_status_histories:
      split.shopping_order_status_histories?.map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        triggered_by: h.triggered_by,
        event_note: h.event_note ?? undefined,
        occurred_at: toISOStringSafe(h.occurred_at),
      })) ?? undefined,
  }));
  // Addresses
  const addresses = order.shopping_order_addresses.map((addr) => ({
    id: addr.id,
    shopping_order_id: addr.shopping_order_id,
    type: addr.type,
    recipient_name: addr.recipient_name,
    recipient_phone: addr.recipient_phone,
    zip_code: addr.zip_code,
    base_address: addr.base_address,
    detail_address: addr.detail_address ?? undefined,
    city: addr.city,
    state_province: addr.state_province,
    country: addr.country,
    created_at: toISOStringSafe(addr.created_at),
    updated_at: toISOStringSafe(addr.updated_at),
  }));
  // Status history
  const statusHistory = order.shopping_order_status_histories.map((s) => ({
    id: s.id,
    shopping_order_id: s.shopping_order_id,
    shopping_order_split_id: s.shopping_order_split_id ?? undefined,
    from_status: s.from_status,
    to_status: s.to_status,
    triggered_by: s.triggered_by,
    event_note: s.event_note ?? undefined,
    occurred_at: toISOStringSafe(s.occurred_at),
  }));
  // Payment attempts
  const paymentAttempts = order.shopping_payment_attempts.map((p) => ({
    id: p.id,
    payment_reference: p.payment_reference ?? undefined,
    attempt_status: typia.assert<
      "pending" | "completed" | "failed" | "cancelled"
    >(p.attempt_status),
    amount: p.amount,
    attempted_at: toISOStringSafe(p.attempted_at),
    completed_at: p.completed_at ? toISOStringSafe(p.completed_at) : undefined,
  }));
  // Shipments
  const shipments = order.shopping_shipments.map((sh) => ({
    id: sh.id,
    seller: {
      id: sh.seller.id,
      display_name: sh.seller.display_name,
      status: sh.seller.status,
    },
    code: sh.code,
    status: sh.status,
    carrier_company: sh.carrier_company,
    scheduled_dispatch_at: sh.scheduled_dispatch_at
      ? toISOStringSafe(sh.scheduled_dispatch_at)
      : undefined,
    dispatched_at: sh.dispatched_at
      ? toISOStringSafe(sh.dispatched_at)
      : undefined,
    delivered_at: sh.delivered_at
      ? toISOStringSafe(sh.delivered_at)
      : undefined,
    canceled_at: sh.canceled_at ? toISOStringSafe(sh.canceled_at) : undefined,
    created_at: toISOStringSafe(sh.created_at),
    updated_at: toISOStringSafe(sh.updated_at),
  }));
  return {
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
    customer: customerSummary,
    order_lines: orderLines,
    order_splits: orderSplits,
    addresses,
    status_history: statusHistory,
    payment_attempts: paymentAttempts,
    shipments,
  };
}
