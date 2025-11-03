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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminOrdersOrderCode(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingOrder.IUpdate;
}): Promise<IShoppingOrder> {
  const { admin, orderCode, body } = props;

  // 1. Find order by order_code
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: orderCode, deleted_at: null },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Mutable fields processing
  const now = toISOStringSafe(new Date());
  const orderUpdate: Record<string, unknown> = { updated_at: now };
  if (typeof body.status === "string") orderUpdate.status = body.status;
  await MyGlobal.prisma.shopping_orders.update({
    where: { id: order.id },
    data: orderUpdate,
  });

  // 3. Update shipping addresses if present
  if (body.shipping_addresses && Array.isArray(body.shipping_addresses)) {
    const existingAddresses =
      await MyGlobal.prisma.shopping_order_addresses.findMany({
        where: { shopping_order_id: order.id },
      });
    for (let i = 0; i < body.shipping_addresses.length; ++i) {
      const inputAddr = body.shipping_addresses[i];
      const existing = existingAddresses[i];
      if (existing) {
        await MyGlobal.prisma.shopping_order_addresses.update({
          where: { id: existing.id },
          data: {
            ...(typeof inputAddr.type === "string"
              ? { type: inputAddr.type }
              : {}),
            ...(typeof inputAddr.recipient_name === "string"
              ? { recipient_name: inputAddr.recipient_name }
              : {}),
            ...(typeof inputAddr.recipient_phone === "string"
              ? { recipient_phone: inputAddr.recipient_phone }
              : {}),
            ...(typeof inputAddr.zip_code === "string"
              ? { zip_code: inputAddr.zip_code }
              : {}),
            ...(typeof inputAddr.base_address === "string"
              ? { base_address: inputAddr.base_address }
              : {}),
            ...(typeof inputAddr.detail_address !== "undefined"
              ? { detail_address: inputAddr.detail_address }
              : {}),
            ...(typeof inputAddr.city === "string"
              ? { city: inputAddr.city }
              : {}),
            ...(typeof inputAddr.state_province === "string"
              ? { state_province: inputAddr.state_province }
              : {}),
            ...(typeof inputAddr.country === "string"
              ? { country: inputAddr.country }
              : {}),
            updated_at: now,
          },
        });
      } else {
        await MyGlobal.prisma.shopping_order_addresses.create({
          data: {
            id: v4(),
            shopping_order_id: order.id,
            type: inputAddr.type ?? "shipping",
            recipient_name: inputAddr.recipient_name ?? "",
            recipient_phone: inputAddr.recipient_phone ?? "",
            zip_code: inputAddr.zip_code ?? "",
            base_address: inputAddr.base_address ?? "",
            detail_address:
              typeof inputAddr.detail_address !== "undefined"
                ? inputAddr.detail_address
                : null,
            city: inputAddr.city ?? "",
            state_province: inputAddr.state_province ?? "",
            country: inputAddr.country ?? "",
            created_at: now,
            updated_at: now,
          },
        });
      }
    }
  }

  // 4. If order status changed, add status history
  if (typeof body.status === "string" && body.status !== order.status) {
    await MyGlobal.prisma.shopping_order_status_histories.create({
      data: {
        id: v4(),
        shopping_order_id: order.id,
        shopping_order_split_id: null,
        from_status: order.status,
        to_status: body.status,
        triggered_by: "admin",
        event_note: null,
        occurred_at: now,
      },
    });
  }

  // 5. Audit log
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      seller_id: null,
      customer_id: null,
      category: "order",
      event_type: "ORDER_UPDATE",
      ip: null,
      description: "Admin updated order via API",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Return full order with necessary joins
  // customer summary
  const customerRow =
    await MyGlobal.prisma.shopping_customers.findUniqueOrThrow({
      where: { id: order.shopping_customer_id },
    });
  const customer: IShoppingCustomer.ISummary = {
    id: customerRow.id,
    name: customerRow.name,
    email: customerRow.email,
    is_active: customerRow.is_active,
    created_at: toISOStringSafe(customerRow.created_at),
    deleted_at:
      customerRow.deleted_at === null
        ? null
        : toISOStringSafe(customerRow.deleted_at),
  };
  // addresses
  const addressesRows = await MyGlobal.prisma.shopping_order_addresses.findMany(
    {
      where: { shopping_order_id: order.id },
    },
  );
  const addresses: IShoppingOrderAddress[] = addressesRows.map((addr) => ({
    id: addr.id,
    shopping_order_id: addr.shopping_order_id,
    type: addr.type,
    recipient_name: addr.recipient_name,
    recipient_phone: addr.recipient_phone,
    zip_code: addr.zip_code,
    base_address: addr.base_address,
    detail_address:
      typeof addr.detail_address !== "undefined"
        ? addr.detail_address
        : undefined,
    city: addr.city,
    state_province: addr.state_province,
    country: addr.country,
    created_at: toISOStringSafe(addr.created_at),
    updated_at: toISOStringSafe(addr.updated_at),
  }));
  // order_lines
  const orderLinesRows = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: { shopping_order_id: order.id },
  });
  const skus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: orderLinesRows.map((x) => x.shopping_sku_id) } },
  });
  const skusMap: Record<string, IShoppingSku.ISummary> = {};
  skus.forEach((sku) => {
    skusMap[sku.id] = {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    };
  });
  const sellers = await MyGlobal.prisma.shopping_sellers.findMany({
    where: { id: { in: orderLinesRows.map((x) => x.shopping_seller_id) } },
  });
  const sellersMap: Record<string, IShoppingSeller.ISummary> = {};
  sellers.forEach((seller) => {
    sellersMap[seller.id] = {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    };
  });
  // Fulfillments
  const orderLineIds = orderLinesRows.map((line) => line.id);
  const fulfillmentsRows =
    await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { shopping_order_line_id: { in: orderLineIds } },
    });
  const fulfillmentsPerLine: Record<
    string,
    IShoppingOrderLineFulfillment.ISummary[]
  > = {};
  fulfillmentsRows.forEach((f) => {
    const summary = {
      id: f.id,
      fulfillment_code: f.fulfillment_code,
      quantity_fulfilled: f.quantity_fulfilled,
      status: f.status,
      fulfilled_at: toISOStringSafe(f.fulfilled_at),
      seller_address_id: f.shopping_seller_address_id,
    };
    if (!fulfillmentsPerLine[f.shopping_order_line_id])
      fulfillmentsPerLine[f.shopping_order_line_id] = [];
    fulfillmentsPerLine[f.shopping_order_line_id].push(summary);
  });
  const order_lines: IShoppingOrderLine[] = orderLinesRows.map((line) => ({
    id: line.id,
    sku: skusMap[line.shopping_sku_id],
    quantity: line.quantity,
    unit_price: line.unit_price,
    status: line.status,
    seller: sellersMap[line.shopping_seller_id],
    fulfillments: fulfillmentsPerLine[line.id],
    created_at: toISOStringSafe(line.created_at),
    updated_at: toISOStringSafe(line.updated_at),
    deleted_at:
      line.deleted_at === null ? null : toISOStringSafe(line.deleted_at),
  }));
  // splits
  const splitsRows = await MyGlobal.prisma.shopping_order_splits.findMany({
    where: { shopping_order_id: order.id },
  });
  const splitSellers = await MyGlobal.prisma.shopping_sellers.findMany({
    where: { id: { in: splitsRows.map((x) => x.shopping_seller_id) } },
  });
  const splitSellersMap: Record<string, IShoppingSeller.ISummary> = {};
  splitSellers.forEach((s) => {
    splitSellersMap[s.id] = {
      id: s.id,
      display_name: s.display_name,
      status: s.status,
    };
  });
  const order_splits: IShoppingOrderSplit[] = splitsRows.map((split) => ({
    id: split.id,
    split_code: split.split_code,
    subtotal_price: split.subtotal_price,
    status: split.status,
    created_at: toISOStringSafe(split.created_at),
    updated_at: split.updated_at
      ? toISOStringSafe(split.updated_at)
      : undefined,
    order_id: split.shopping_order_id,
    seller: splitSellersMap[split.shopping_seller_id],
  }));
  // status_history
  const statusHistRows =
    await MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: { shopping_order_id: order.id },
    });
  const status_history: IShoppingOrderStatusHistory[] = statusHistRows.map(
    (sh) => ({
      id: sh.id,
      shopping_order_id: sh.shopping_order_id,
      shopping_order_split_id: sh.shopping_order_split_id ?? undefined,
      from_status: sh.from_status,
      to_status: sh.to_status,
      triggered_by: sh.triggered_by,
      event_note: sh.event_note ?? undefined,
      occurred_at: toISOStringSafe(sh.occurred_at),
    }),
  );
  // payment_attempts
  const paymentRows = await MyGlobal.prisma.shopping_payment_attempts.findMany({
    where: { shopping_order_id: order.id },
  });
  const payment_attempts: IShoppingOrderPaymentAttempt[] = paymentRows.map(
    (pa) => ({
      id: pa.id,
      payment_reference: pa.payment_reference ?? undefined,
      attempt_status: typia.assert<
        "pending" | "completed" | "failed" | "cancelled"
      >(pa.attempt_status),
      amount: pa.amount,
      attempted_at: toISOStringSafe(pa.attempted_at),
      completed_at: pa.completed_at
        ? toISOStringSafe(pa.completed_at)
        : undefined,
    }),
  );
  // shipments
  const shipmentsRows = await MyGlobal.prisma.shopping_shipments.findMany({
    where: { shopping_order_id: order.id },
  });
  const shipmentSellers = await MyGlobal.prisma.shopping_sellers.findMany({
    where: { id: { in: shipmentsRows.map((shr) => shr.shopping_seller_id) } },
  });
  const shipmentSellersMap: Record<string, IShoppingSeller.ISummary> = {};
  shipmentSellers.forEach((ss) => {
    shipmentSellersMap[ss.id] = {
      id: ss.id,
      display_name: ss.display_name,
      status: ss.status,
    };
  });
  const shipments: IShoppingOrderShipment[] = shipmentsRows.map((s) => ({
    id: s.id,
    seller: shipmentSellersMap[s.shopping_seller_id],
    code: s.code,
    status: s.status,
    carrier_company: s.carrier_company,
    scheduled_dispatch_at: s.scheduled_dispatch_at
      ? toISOStringSafe(s.scheduled_dispatch_at)
      : undefined,
    dispatched_at: s.dispatched_at
      ? toISOStringSafe(s.dispatched_at)
      : undefined,
    delivered_at: s.delivered_at ? toISOStringSafe(s.delivered_at) : undefined,
    canceled_at: s.canceled_at ? toISOStringSafe(s.canceled_at) : undefined,
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
  }));
  return {
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: body.status ?? order.status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: now,
    deleted_at:
      order.deleted_at === null ? null : toISOStringSafe(order.deleted_at),
    customer,
    order_lines,
    order_splits,
    addresses,
    status_history,
    payment_attempts,
    shipments,
  };
}
