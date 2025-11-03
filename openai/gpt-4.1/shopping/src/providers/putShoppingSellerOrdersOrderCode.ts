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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerOrdersOrderCode(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingOrder.IUpdate;
}): Promise<IShoppingOrder> {
  const { seller, orderCode, body } = props;

  // Get main order and its customer
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
    include: { customer: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Get order sub-tables for seller authorization (no includes for invalid fields)
  const [orderLines, orderSplits, shipments] = await Promise.all([
    MyGlobal.prisma.shopping_order_lines.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_order_splits.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_shipments.findMany({
      where: { shopping_order_id: order.id },
    }),
  ]);
  // Seller must be associated with this order
  const hasSellerOrder =
    orderLines.some((line) => line.shopping_seller_id === seller.id) ||
    orderSplits.some((split) => split.shopping_seller_id === seller.id) ||
    shipments.some((shipment) => shipment.shopping_seller_id === seller.id);
  if (!hasSellerOrder)
    throw new HttpException("Unauthorized for this order", 403);
  if (order.status === "fulfilled") {
    throw new HttpException("Order cannot be updated after fulfillment", 400);
  }

  // Update allowed order fields
  const updatable: {
    status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.status !== undefined) updatable.status = body.status;
  await MyGlobal.prisma.shopping_orders.update({
    where: { order_code: orderCode },
    data: updatable,
  });

  // Update addresses if needed (merge to current by type)
  if (body.shipping_addresses && Array.isArray(body.shipping_addresses)) {
    const addresses = await MyGlobal.prisma.shopping_order_addresses.findMany({
      where: { shopping_order_id: order.id },
    });
    for (const addr of body.shipping_addresses) {
      const orderAddress = addresses.find((a) => a.type === addr.type);
      if (!orderAddress) continue;
      await MyGlobal.prisma.shopping_order_addresses.update({
        where: { id: orderAddress.id },
        data: {
          recipient_name: addr.recipient_name ?? undefined,
          recipient_phone: addr.recipient_phone ?? undefined,
          zip_code: addr.zip_code ?? undefined,
          base_address: addr.base_address ?? undefined,
          detail_address: addr.detail_address ?? undefined,
          city: addr.city ?? undefined,
          state_province: addr.state_province ?? undefined,
          country: addr.country ?? undefined,
        },
      });
    }
  }
  // Status history if needed
  if (body.status !== undefined) {
    await MyGlobal.prisma.shopping_order_status_histories.create({
      data: {
        id: v4(),
        shopping_order_id: order.id,
        shopping_order_split_id: null,
        from_status: order.status,
        to_status: body.status,
        triggered_by: "seller",
        event_note: undefined,
        occurred_at: toISOStringSafe(new Date()),
      },
    });
  }

  // Reselect all order-related entities for API response
  const [
    latestOrder,
    customer,
    linesRaw,
    splitsRaw,
    addressesRaw,
    statusHistoryRaw,
    paymentAttemptsRaw,
    shipmentsRaw,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_orders.findUnique({
      where: { order_code: orderCode },
    }),
    MyGlobal.prisma.shopping_customers.findUnique({
      where: { id: order.shopping_customer_id },
    }),
    MyGlobal.prisma.shopping_order_lines.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_order_splits.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_order_addresses.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_payment_attempts.findMany({
      where: { shopping_order_id: order.id },
    }),
    MyGlobal.prisma.shopping_shipments.findMany({
      where: { shopping_order_id: order.id },
    }),
  ]);
  if (!latestOrder || !customer)
    throw new HttpException("Order or customer not found after update", 500);

  // --- Additional lookup for nested relations ---
  // Get all needed SKUs and Sellers (map by id)
  const allSkuIds = Array.from(new Set(linesRaw.map((l) => l.shopping_sku_id)));
  const allSellerIds = Array.from(
    new Set([
      ...linesRaw.map((l) => l.shopping_seller_id),
      ...splitsRaw.map((s) => s.shopping_seller_id),
      ...shipmentsRaw.map((s) => s.shopping_seller_id),
    ]),
  );
  const [skus, sellers] = await Promise.all([
    MyGlobal.prisma.shopping_skus.findMany({
      where: { id: { in: allSkuIds } },
    }),
    MyGlobal.prisma.shopping_sellers.findMany({
      where: { id: { in: allSellerIds } },
    }),
  ]);
  const skuMap = Object.fromEntries(skus.map((x) => [x.id, x]));
  const sellerMap = Object.fromEntries(sellers.map((x) => [x.id, x]));
  // fulfillments by line (just use arrays, no type annotation or Prisma.type)
  const allLineIds = linesRaw.map((l) => l.id);
  const fulfillmentsAll =
    await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { shopping_order_line_id: { in: allLineIds } },
    });
  const fulfillByLine: Record<string, any[]> = {};
  for (const fm of fulfillmentsAll) {
    (fulfillByLine[fm.shopping_order_line_id] ||= []).push(fm);
  }

  // order_status_histories by split
  const allSplitIds = splitsRaw.map((s) => s.id);
  const allSplitHistories =
    await MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: { shopping_order_split_id: { in: allSplitIds } },
    });
  const splitHistoriesMap: Record<string, any[]> = {};
  for (const h of allSplitHistories) {
    if (h.shopping_order_split_id)
      (splitHistoriesMap[h.shopping_order_split_id] ||= []).push(h);
  }

  // --- API DTO Mapping
  return {
    id: latestOrder.id,
    order_code: latestOrder.order_code,
    total_price: latestOrder.total_price,
    status: latestOrder.status,
    created_at: toISOStringSafe(latestOrder.created_at),
    updated_at: toISOStringSafe(latestOrder.updated_at),
    deleted_at: latestOrder.deleted_at
      ? toISOStringSafe(latestOrder.deleted_at)
      : undefined,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      is_active: customer.is_active,
      created_at: toISOStringSafe(customer.created_at),
      deleted_at: customer.deleted_at
        ? toISOStringSafe(customer.deleted_at)
        : null,
    },
    order_lines: linesRaw.map((line) => ({
      id: line.id,
      sku: (() => {
        const sku = skuMap[line.shopping_sku_id];
        return {
          id: sku.id,
          sku_code: sku.sku_code,
          price: sku.price,
          is_active: sku.is_active,
          status: sku.status,
        };
      })(),
      quantity: line.quantity,
      unit_price: line.unit_price,
      status: line.status,
      seller: (() => {
        const seller = sellerMap[line.shopping_seller_id];
        return {
          id: seller.id,
          display_name: seller.display_name,
          status: seller.status,
        };
      })(),
      fulfillments: (fulfillByLine[line.id] || []).map((fm) => ({
        id: fm.id,
        fulfillment_code: fm.fulfillment_code,
        quantity_fulfilled: fm.quantity_fulfilled,
        status: fm.status,
        fulfilled_at: toISOStringSafe(fm.fulfilled_at),
        seller_address_id: fm.shopping_seller_address_id,
      })),
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at: line.deleted_at
        ? toISOStringSafe(line.deleted_at)
        : undefined,
    })),
    order_splits: splitsRaw.map((split) => ({
      id: split.id,
      split_code: split.split_code,
      subtotal_price: split.subtotal_price,
      status: split.status,
      created_at: toISOStringSafe(split.created_at),
      updated_at: toISOStringSafe(split.updated_at),
      order_id: split.shopping_order_id,
      seller: (() => {
        const seller = sellerMap[split.shopping_seller_id];
        return {
          id: seller.id,
          display_name: seller.display_name,
          status: seller.status,
        };
      })(),
      order_status_histories: (splitHistoriesMap[split.id] || []).map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        triggered_by: h.triggered_by,
        event_note: h.event_note ?? undefined,
        occurred_at: toISOStringSafe(h.occurred_at),
      })),
    })),
    addresses: addressesRaw.map((addr) => ({
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
    status_history: statusHistoryRaw.map((h) => ({
      id: h.id,
      shopping_order_id: h.shopping_order_id,
      shopping_order_split_id: h.shopping_order_split_id ?? undefined,
      from_status: h.from_status,
      to_status: h.to_status,
      triggered_by: h.triggered_by,
      event_note: h.event_note ?? undefined,
      occurred_at: toISOStringSafe(h.occurred_at),
    })),
    payment_attempts: paymentAttemptsRaw.map((pa) => ({
      id: pa.id,
      payment_reference: pa.payment_reference ?? undefined,
      attempt_status: pa.attempt_status as
        | "pending"
        | "completed"
        | "failed"
        | "cancelled",
      amount: pa.amount,
      attempted_at: toISOStringSafe(pa.attempted_at),
      completed_at: pa.completed_at
        ? toISOStringSafe(pa.completed_at)
        : undefined,
    })),
    shipments: shipmentsRaw.map((shipment) => ({
      id: shipment.id,
      seller: (() => {
        const seller = sellerMap[shipment.shopping_seller_id];
        return {
          id: seller.id,
          display_name: seller.display_name,
          status: seller.status,
        };
      })(),
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
