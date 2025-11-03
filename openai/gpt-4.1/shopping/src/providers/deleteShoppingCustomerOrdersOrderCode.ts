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

export async function deleteShoppingCustomerOrdersOrderCode(props: {
  customer: CustomerPayload;
  orderCode: string;
}): Promise<IShoppingOrder> {
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      shopping_order_lines: true,
      shopping_order_splits: true,
      shopping_order_addresses: true,
      shopping_order_status_histories: true,
      shopping_payment_attempts: true,
      shopping_shipments: true,
      customer: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found, or not accessible", 404);
  }

  const nonDeletable = [
    "fulfilled",
    "paid",
    "processing",
    "completed",
    "cancelled",
    "under_refund",
  ];
  if (nonDeletable.indexOf(order.status) !== -1) {
    throw new HttpException(
      "Order cannot be deleted in its current state",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_orders.update({
    where: {
      id: order.id,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
    include: {
      shopping_order_lines: true,
      shopping_order_splits: true,
      shopping_order_addresses: true,
      shopping_order_status_histories: true,
      shopping_payment_attempts: true,
      shopping_shipments: true,
      customer: true,
    },
  });

  // Auxiliary lookup for seller and sku info (batch fetch for efficiency)
  const skuIds: string[] = updated.shopping_order_lines.map(
    (l) => l.shopping_sku_id,
  );
  const sellerIds: string[] = Array.from(
    new Set([
      ...updated.shopping_order_lines.map((l) => l.shopping_seller_id),
      ...updated.shopping_order_splits.map((s) => s.shopping_seller_id),
      ...updated.shopping_shipments.map((s) => s.shopping_seller_id),
    ]),
  );

  const skus =
    skuIds.length > 0
      ? await MyGlobal.prisma.shopping_skus.findMany({
          where: { id: { in: skuIds } },
        })
      : [];
  const sellers =
    sellerIds.length > 0
      ? await MyGlobal.prisma.shopping_sellers.findMany({
          where: { id: { in: sellerIds } },
        })
      : [];
  const skusById = Object.fromEntries(skus.map((sku) => [sku.id, sku]));
  const sellersById = Object.fromEntries(sellers.map((sel) => [sel.id, sel]));

  // Mapline fulfillments: batch fetch for all lines
  const lineIds: string[] = updated.shopping_order_lines.map((line) => line.id);
  const fulfillments =
    lineIds.length > 0
      ? await MyGlobal.prisma.shopping_order_fulfillments.findMany({
          where: { shopping_order_line_id: { in: lineIds } },
          orderBy: { created_at: "asc" },
        })
      : [];
  const fulfillmentsByLine: Record<string, typeof fulfillments> = {};
  for (const fulfill of fulfillments) {
    if (!fulfillmentsByLine[fulfill.shopping_order_line_id])
      fulfillmentsByLine[fulfill.shopping_order_line_id] = [];
    fulfillmentsByLine[fulfill.shopping_order_line_id].push(fulfill);
  }

  // For split status histories
  const splitIds: string[] = updated.shopping_order_splits.map((s) => s.id);
  const splitStatus =
    splitIds.length > 0
      ? await MyGlobal.prisma.shopping_order_status_histories.findMany({
          where: { shopping_order_split_id: { in: splitIds } },
          orderBy: { occurred_at: "asc" },
        })
      : [];
  const splitStatusBySplit: Record<string, typeof splitStatus> = {};
  for (const st of splitStatus) {
    if (!splitStatusBySplit[st.shopping_order_split_id!])
      splitStatusBySplit[st.shopping_order_split_id!] = [];
    splitStatusBySplit[st.shopping_order_split_id!].push(st);
  }

  return {
    id: updated.id,
    order_code: updated.order_code,
    total_price: updated.total_price,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    customer: {
      id: updated.customer.id,
      name: updated.customer.name,
      email: updated.customer.email,
      is_active: updated.customer.is_active,
      created_at: toISOStringSafe(updated.customer.created_at),
      deleted_at: updated.customer.deleted_at
        ? toISOStringSafe(updated.customer.deleted_at)
        : null,
    },
    order_lines: updated.shopping_order_lines.map((line) => {
      const sku = skusById[line.shopping_sku_id];
      const seller = sellersById[line.shopping_seller_id];
      return {
        id: line.id,
        sku: sku
          ? {
              id: sku.id,
              sku_code: sku.sku_code,
              price: sku.price,
              is_active: sku.is_active,
              status: sku.status,
            }
          : {
              id: line.shopping_sku_id,
              sku_code: "",
              price: 0,
              is_active: false,
              status: "",
            },
        quantity: line.quantity,
        unit_price: line.unit_price,
        status: line.status,
        seller: seller
          ? {
              id: seller.id,
              display_name: seller.display_name,
              status: seller.status,
            }
          : {
              id: line.shopping_seller_id,
              display_name: "",
              status: "",
            },
        fulfillments: fulfillmentsByLine[line.id]
          ? fulfillmentsByLine[line.id].map((f) => ({
              id: f.id,
              fulfillment_code: f.fulfillment_code,
              quantity_fulfilled: f.quantity_fulfilled,
              status: f.status,
              fulfilled_at: toISOStringSafe(f.fulfilled_at),
              seller_address_id: f.shopping_seller_address_id,
            }))
          : undefined,
        created_at: toISOStringSafe(line.created_at),
        updated_at: toISOStringSafe(line.updated_at),
        deleted_at: line.deleted_at
          ? toISOStringSafe(line.deleted_at)
          : undefined,
      };
    }),
    order_splits: updated.shopping_order_splits.map((split) => {
      const seller = sellersById[split.shopping_seller_id];
      return {
        id: split.id,
        split_code: split.split_code,
        subtotal_price: split.subtotal_price,
        status: split.status,
        created_at: toISOStringSafe(split.created_at),
        updated_at: split.updated_at
          ? toISOStringSafe(split.updated_at)
          : undefined,
        order_id: split.shopping_order_id,
        seller: seller
          ? {
              id: seller.id,
              display_name: seller.display_name,
              status: seller.status,
            }
          : {
              id: split.shopping_seller_id,
              display_name: "",
              status: "",
            },
        order_status_histories: splitStatusBySplit[split.id]
          ? splitStatusBySplit[split.id].map((hist) => ({
              id: hist.id,
              from_status: hist.from_status,
              to_status: hist.to_status,
              triggered_by: hist.triggered_by,
              event_note: hist.event_note ?? undefined,
              occurred_at: toISOStringSafe(hist.occurred_at),
            }))
          : undefined,
      };
    }),
    addresses: updated.shopping_order_addresses.map((addr) => ({
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
    status_history: updated.shopping_order_status_histories.map((hist) => ({
      id: hist.id,
      shopping_order_id: hist.shopping_order_id,
      shopping_order_split_id: hist.shopping_order_split_id ?? undefined,
      from_status: hist.from_status,
      to_status: hist.to_status,
      triggered_by: hist.triggered_by,
      event_note: hist.event_note ?? undefined,
      occurred_at: toISOStringSafe(hist.occurred_at),
    })),
    payment_attempts: updated.shopping_payment_attempts.map((pay) => ({
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
    shipments: updated.shopping_shipments.map((ship) => {
      const seller = sellersById[ship.shopping_seller_id];
      return {
        id: ship.id,
        seller: seller
          ? {
              id: seller.id,
              display_name: seller.display_name,
              status: seller.status,
            }
          : {
              id: ship.shopping_seller_id,
              display_name: "",
              status: "",
            },
        code: ship.code,
        status: ship.status,
        carrier_company: ship.carrier_company,
        scheduled_dispatch_at: ship.scheduled_dispatch_at
          ? toISOStringSafe(ship.scheduled_dispatch_at)
          : undefined,
        dispatched_at: ship.dispatched_at
          ? toISOStringSafe(ship.dispatched_at)
          : undefined,
        delivered_at: ship.delivered_at
          ? toISOStringSafe(ship.delivered_at)
          : undefined,
        canceled_at: ship.canceled_at
          ? toISOStringSafe(ship.canceled_at)
          : undefined,
        created_at: toISOStringSafe(ship.created_at),
        updated_at: toISOStringSafe(ship.updated_at),
      };
    }),
  };
}
