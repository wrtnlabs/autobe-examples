import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerOrdersOrderCode(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingOrder.IUpdate;
}): Promise<IShoppingOrder> {
  // Find the order by its order_code
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: props.orderCode },
    include: { customer: true },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  // Only the owning customer may update
  if (order.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden. You are not the owner of this order.",
      403,
    );
  }
  // Updates not allowed after fulfillment/shipped/canceled
  if (
    order.status === "fulfilled" ||
    order.status === "shipped" ||
    order.status === "canceled"
  ) {
    throw new HttpException(
      "Cannot update an order that is fulfilled, shipped, or canceled",
      400,
    );
  }
  // Prepare status mutation if needed
  if (typeof props.body.status === "string") {
    await MyGlobal.prisma.shopping_orders.update({
      where: { id: order.id },
      data: { status: props.body.status },
    });
  }
  // Update shipping addresses in-place (by array position, no add/remove)
  if (
    Array.isArray(props.body.shipping_addresses) &&
    props.body.shipping_addresses.length > 0
  ) {
    const addresses = await MyGlobal.prisma.shopping_order_addresses.findMany({
      where: { shopping_order_id: order.id },
      orderBy: { created_at: "asc" },
    });
    for (let idx = 0; idx < props.body.shipping_addresses.length; ++idx) {
      const upd = props.body.shipping_addresses[idx];
      const addr = addresses[idx];
      if (!addr) break;
      await MyGlobal.prisma.shopping_order_addresses.update({
        where: { id: addr.id },
        data: {
          ...(typeof upd.type === "string" && { type: upd.type }),
          ...(typeof upd.recipient_name === "string" && {
            recipient_name: upd.recipient_name,
          }),
          ...(typeof upd.recipient_phone === "string" && {
            recipient_phone: upd.recipient_phone,
          }),
          ...(typeof upd.zip_code === "string" && { zip_code: upd.zip_code }),
          ...(typeof upd.base_address === "string" && {
            base_address: upd.base_address,
          }),
          ...("detail_address" in upd && {
            detail_address: upd.detail_address,
          }),
          ...(typeof upd.city === "string" && { city: upd.city }),
          ...(typeof upd.state_province === "string" && {
            state_province: upd.state_province,
          }),
          ...(typeof upd.country === "string" && { country: upd.country }),
        },
      });
    }
  }
  // Reload full order with nested references
  const full = await MyGlobal.prisma.shopping_orders.findUnique({
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
      shopping_shipments: { include: { seller: true } },
    },
  });
  if (!full) {
    throw new HttpException("Order not found after update", 404);
  }
  // Build IShoppingOrder response
  return {
    id: full.id,
    order_code: full.order_code,
    total_price: full.total_price,
    status: full.status,
    created_at: toISOStringSafe(full.created_at),
    updated_at: toISOStringSafe(full.updated_at),
    deleted_at:
      full.deleted_at !== null ? toISOStringSafe(full.deleted_at) : undefined,
    customer: {
      id: full.customer.id,
      name: full.customer.name,
      email: full.customer.email,
      is_active: full.customer.is_active,
      created_at: toISOStringSafe(full.customer.created_at),
      deleted_at:
        full.customer.deleted_at !== null
          ? toISOStringSafe(full.customer.deleted_at)
          : null,
    },
    order_lines: full.shopping_order_lines.map((line) => ({
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
      fulfillments: Array.isArray(line.shopping_order_fulfillments)
        ? line.shopping_order_fulfillments.map((ful) => ({
            id: ful.id,
            fulfillment_code: ful.fulfillment_code,
            quantity_fulfilled: ful.quantity_fulfilled,
            status: ful.status,
            fulfilled_at: toISOStringSafe(ful.fulfilled_at),
            seller_address_id: ful.shopping_seller_address_id,
          }))
        : undefined,
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at:
        line.deleted_at !== null ? toISOStringSafe(line.deleted_at) : undefined,
    })),
    order_splits: full.shopping_order_splits.map((split) => ({
      id: split.id,
      split_code: split.split_code,
      subtotal_price: split.subtotal_price,
      status: split.status,
      created_at: toISOStringSafe(split.created_at),
      updated_at:
        split.updated_at !== null
          ? toISOStringSafe(split.updated_at)
          : undefined,
      order_id: split.shopping_order_id,
      seller: {
        id: split.seller.id,
        display_name: split.seller.display_name,
        status: split.seller.status,
      },
      order_status_histories: Array.isArray(
        split.shopping_order_status_histories,
      )
        ? split.shopping_order_status_histories.map((s) => ({
            id: s.id,
            from_status: s.from_status,
            to_status: s.to_status,
            triggered_by: s.triggered_by,
            event_note: s.event_note ?? undefined,
            occurred_at: toISOStringSafe(s.occurred_at),
          }))
        : undefined,
    })),
    addresses: full.shopping_order_addresses.map((addr) => ({
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
    status_history: full.shopping_order_status_histories.map((s) => ({
      id: s.id,
      shopping_order_id: s.shopping_order_id,
      shopping_order_split_id: s.shopping_order_split_id ?? undefined,
      from_status: s.from_status,
      to_status: s.to_status,
      triggered_by: s.triggered_by,
      event_note: s.event_note ?? undefined,
      occurred_at: toISOStringSafe(s.occurred_at),
    })),
    payment_attempts: full.shopping_payment_attempts.map((a) => ({
      id: a.id,
      payment_reference: a.payment_reference ?? undefined,
      attempt_status: typia.assert<
        "pending" | "completed" | "failed" | "cancelled"
      >(a.attempt_status),
      amount: a.amount,
      attempted_at: toISOStringSafe(a.attempted_at),
      completed_at:
        a.completed_at !== null ? toISOStringSafe(a.completed_at) : undefined,
    })),
    shipments: full.shopping_shipments.map((sh) => ({
      id: sh.id,
      seller: {
        id: sh.seller.id,
        display_name: sh.seller.display_name,
        status: sh.seller.status,
      },
      code: sh.code,
      status: sh.status,
      carrier_company: sh.carrier_company,
      scheduled_dispatch_at:
        sh.scheduled_dispatch_at !== null
          ? toISOStringSafe(sh.scheduled_dispatch_at)
          : undefined,
      dispatched_at:
        sh.dispatched_at !== null
          ? toISOStringSafe(sh.dispatched_at)
          : undefined,
      delivered_at:
        sh.delivered_at !== null ? toISOStringSafe(sh.delivered_at) : undefined,
      canceled_at:
        sh.canceled_at !== null ? toISOStringSafe(sh.canceled_at) : undefined,
      created_at: toISOStringSafe(sh.created_at),
      updated_at: toISOStringSafe(sh.updated_at),
    })),
  };
}
