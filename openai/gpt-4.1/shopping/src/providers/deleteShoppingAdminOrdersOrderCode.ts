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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminOrdersOrderCode(props: {
  admin: AdminPayload;
  orderCode: string;
}): Promise<IShoppingOrder> {
  // Find order by order_code
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.deleted_at !== null) {
    throw new HttpException("Order is already deleted", 400);
  }
  // Only allow delete for status 'pending' (as per test and summary)
  const blockedStatuses = [
    "paid",
    "fulfilled",
    "refunded",
    "cancelled",
    "processing",
    "shipped",
    "delivered",
    "under_refund",
  ];
  if (blockedStatuses.includes(order.status)) {
    throw new HttpException(
      "Order cannot be deleted due to business status",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_orders.update({
    where: { id: order.id },
    data: { deleted_at: now, updated_at: now },
  });
  // Reload the soft-deleted order with all details
  const o = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { id: order.id },
    include: {
      customer: true,
      shopping_order_lines: {
        include: {
          sku: true,
          seller: true,
          shopping_order_fulfillments: true,
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
      shopping_shipments: {
        include: {
          seller: true,
        },
      },
    },
  });
  if (!o) throw new HttpException("Deleted order not found", 500);
  return {
    id: o.id,
    order_code: o.order_code,
    total_price: o.total_price,
    status: o.status,
    created_at: toISOStringSafe(o.created_at),
    updated_at: toISOStringSafe(o.updated_at),
    deleted_at: o.deleted_at ? toISOStringSafe(o.deleted_at) : undefined,
    customer: {
      id: o.customer.id,
      name: o.customer.name,
      email: o.customer.email,
      is_active: o.customer.is_active,
      created_at: toISOStringSafe(o.customer.created_at),
      deleted_at:
        o.customer.deleted_at === null
          ? null
          : toISOStringSafe(o.customer.deleted_at),
    },
    order_lines: o.shopping_order_lines.map((line) => ({
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
      fulfillments: line.shopping_order_fulfillments?.map((f) => ({
        id: f.id,
        fulfillment_code: f.fulfillment_code,
        quantity_fulfilled: f.quantity_fulfilled,
        status: f.status,
        fulfilled_at: toISOStringSafe(f.fulfilled_at),
        seller_address_id: f.shopping_seller_address_id,
      })),
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at:
        line.deleted_at === null ? undefined : toISOStringSafe(line.deleted_at),
    })),
    order_splits: o.shopping_order_splits.map((split) => ({
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
      order_status_histories: split.shopping_order_status_histories?.map(
        (ev) => ({
          id: ev.id,
          from_status: ev.from_status,
          to_status: ev.to_status,
          triggered_by: ev.triggered_by,
          event_note: ev.event_note ?? undefined,
          occurred_at: toISOStringSafe(ev.occurred_at),
        }),
      ),
    })),
    addresses: o.shopping_order_addresses.map((addr) => ({
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
    })),
    status_history: o.shopping_order_status_histories.map((ev) => ({
      id: ev.id,
      shopping_order_id: ev.shopping_order_id,
      shopping_order_split_id: ev.shopping_order_split_id ?? undefined,
      from_status: ev.from_status,
      to_status: ev.to_status,
      triggered_by: ev.triggered_by,
      event_note: ev.event_note ?? undefined,
      occurred_at: toISOStringSafe(ev.occurred_at),
    })),
    payment_attempts: o.shopping_payment_attempts.map((pay) => ({
      id: pay.id,
      payment_reference: pay.payment_reference ?? undefined,
      attempt_status: typia.assert<
        "pending" | "completed" | "failed" | "cancelled"
      >(pay.attempt_status),
      amount: pay.amount,
      attempted_at: toISOStringSafe(pay.attempted_at),
      completed_at: pay.completed_at
        ? toISOStringSafe(pay.completed_at)
        : undefined,
    })),
    shipments: o.shopping_shipments.map((shipment) => ({
      id: shipment.id,
      seller: {
        id: shipment.seller.id,
        display_name: shipment.seller.display_name,
        status: shipment.seller.status,
      },
      code: shipment.code,
      status: shipment.status,
      carrier_company: shipment.carrier_company,
      scheduled_dispatch_at: shipment.scheduled_dispatch_at
        ? toISOStringSafe(shipment.scheduled_dispatch_at)
        : undefined,
      dispatched_at: shipment.dispatched_at
        ? toISOStringSafe(shipment.dispatched_at)
        : undefined,
      delivered_at: shipment.delivered_at
        ? toISOStringSafe(shipment.delivered_at)
        : undefined,
      canceled_at: shipment.canceled_at
        ? toISOStringSafe(shipment.canceled_at)
        : undefined,
      created_at: toISOStringSafe(shipment.created_at),
      updated_at: toISOStringSafe(shipment.updated_at),
    })),
  };
}
