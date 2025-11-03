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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerOrdersOrderCode(props: {
  seller: SellerPayload;
  orderCode: string;
}): Promise<IShoppingOrder> {
  // Fetch order and all related data by order_code
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    include: {
      customer: true,
      shopping_order_lines: {
        include: {
          sku: {
            include: { product: { select: { shopping_seller_id: true } } },
          },
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
        include: { seller: true },
      },
    },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Authorization: must have at least one order line for seller's product
  const anyLineForSeller = order.shopping_order_lines.some(
    (line: any) => line.sku.product.shopping_seller_id === props.seller.id,
  );
  if (!anyLineForSeller) throw new HttpException("Forbidden", 403);

  // Customer summary
  const customer = order.customer;
  const customerSummary = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    is_active: customer.is_active,
    created_at: toISOStringSafe(customer.created_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  };

  // Order lines
  const order_lines = order.shopping_order_lines.map((line: any) => {
    const sku = line.sku;
    const seller = line.seller;
    return {
      id: line.id,
      sku: {
        id: sku.id,
        sku_code: sku.sku_code,
        price: sku.price,
        is_active: sku.is_active,
        status: sku.status,
      },
      quantity: line.quantity,
      unit_price: line.unit_price,
      status: line.status,
      seller: {
        id: seller.id,
        display_name: seller.display_name,
        status: seller.status,
      },
      fulfillments: line.shopping_order_fulfillments.map((f: any) => ({
        id: f.id,
        fulfillment_code: f.fulfillment_code,
        quantity_fulfilled: f.quantity_fulfilled,
        status: f.status,
        fulfilled_at: toISOStringSafe(f.fulfilled_at),
        seller_address_id: f.shopping_seller_address_id,
      })),
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at: line.deleted_at
        ? toISOStringSafe(line.deleted_at)
        : undefined,
    };
  });

  // Order splits
  const order_splits = order.shopping_order_splits.map((split: any) => {
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
      seller: {
        id: split.seller.id,
        display_name: split.seller.display_name,
        status: split.seller.status,
      },
      order_status_histories: split.shopping_order_status_histories.map(
        (h: any) => ({
          id: h.id,
          from_status: h.from_status,
          to_status: h.to_status,
          triggered_by: h.triggered_by,
          event_note: h.event_note ?? undefined,
          occurred_at: toISOStringSafe(h.occurred_at),
        }),
      ),
    };
  });

  // Addresses
  const addresses = order.shopping_order_addresses.map((addr: any) => ({
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
  const status_history = order.shopping_order_status_histories.map(
    (h: any) => ({
      id: h.id,
      shopping_order_id: h.shopping_order_id,
      shopping_order_split_id: h.shopping_order_split_id ?? undefined,
      from_status: h.from_status,
      to_status: h.to_status,
      triggered_by: h.triggered_by,
      event_note: h.event_note ?? undefined,
      occurred_at: toISOStringSafe(h.occurred_at),
    }),
  );

  // Payment attempts
  const payment_attempts = order.shopping_payment_attempts.map((pa: any) => ({
    id: pa.id,
    payment_reference: pa.payment_reference ?? undefined,
    attempt_status: pa.attempt_status,
    amount: pa.amount,
    attempted_at: toISOStringSafe(pa.attempted_at),
    completed_at: pa.completed_at
      ? toISOStringSafe(pa.completed_at)
      : undefined,
  }));

  // Shipments
  const shipments = order.shopping_shipments.map((sh: any) => ({
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
    order_lines,
    order_splits,
    addresses,
    status_history,
    payment_attempts,
    shipments,
  };
}
