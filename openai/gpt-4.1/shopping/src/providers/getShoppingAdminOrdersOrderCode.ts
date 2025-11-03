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

export async function getShoppingAdminOrdersOrderCode(props: {
  admin: AdminPayload;
  orderCode: string;
}): Promise<IShoppingOrder> {
  const { orderCode } = props;

  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
  });
  if (!order) throw new HttpException("Order not found", 404);

  const [
    customer,
    order_lines,
    splits,
    addresses,
    status_histories,
    payment_attempts,
    shipments,
  ] = await Promise.all([
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

  const customerSummary: IShoppingCustomer.ISummary = {
    id: customer!.id,
    name: customer!.name,
    email: customer!.email,
    is_active: customer!.is_active,
    created_at: toISOStringSafe(customer!.created_at),
    deleted_at: customer!.deleted_at
      ? toISOStringSafe(customer!.deleted_at)
      : null,
  };

  const skuIds = order_lines.map(
    (l: (typeof order_lines)[number]) => l.shopping_sku_id,
  );
  const sellerIds = order_lines.map(
    (l: (typeof order_lines)[number]) => l.shopping_seller_id,
  );
  const [skus, sellers] = await Promise.all([
    MyGlobal.prisma.shopping_skus.findMany({ where: { id: { in: skuIds } } }),
    MyGlobal.prisma.shopping_sellers.findMany({
      where: { id: { in: sellerIds } },
    }),
  ]);
  const fulFillmentsByLine = await Promise.all(
    order_lines.map((l: (typeof order_lines)[number]) =>
      MyGlobal.prisma.shopping_order_fulfillments.findMany({
        where: { shopping_order_line_id: l.id },
      }),
    ),
  );

  const orderLines: IShoppingOrderLine[] = order_lines.map(
    (line: (typeof order_lines)[number], i: number) => {
      const sku = skus.find((s) => s.id === line.shopping_sku_id)!;
      const seller = sellers.find((s) => s.id === line.shopping_seller_id)!;
      const fulfillments = fulFillmentsByLine[i].map(
        (f: (typeof fulFillmentsByLine)[number][number]) => ({
          id: f.id,
          fulfillment_code: f.fulfillment_code,
          quantity_fulfilled: f.quantity_fulfilled,
          status: f.status,
          fulfilled_at: toISOStringSafe(f.fulfilled_at),
          seller_address_id: f.shopping_seller_address_id,
        }),
      );
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
        fulfillments: fulfillments.length > 0 ? fulfillments : undefined,
        created_at: toISOStringSafe(line.created_at),
        updated_at: toISOStringSafe(line.updated_at),
        deleted_at: line.deleted_at
          ? toISOStringSafe(line.deleted_at)
          : undefined,
      };
    },
  );

  const splitSellerIds = splits.map(
    (s: (typeof splits)[number]) => s.shopping_seller_id,
  );
  const splitSellers = await MyGlobal.prisma.shopping_sellers.findMany({
    where: { id: { in: splitSellerIds } },
  });
  const splitStatusHistories = await Promise.all(
    splits.map((s: (typeof splits)[number]) =>
      MyGlobal.prisma.shopping_order_status_histories.findMany({
        where: { shopping_order_split_id: s.id },
      }),
    ),
  );
  const orderSplits: IShoppingOrderSplit[] = splits.map(
    (split: (typeof splits)[number], i: number) => {
      const seller = splitSellers.find(
        (s) => s.id === split.shopping_seller_id,
      )!;
      const statusHistories = splitStatusHistories[i].map(
        (history: (typeof splitStatusHistories)[number][number]) => ({
          id: history.id,
          from_status: history.from_status,
          to_status: history.to_status,
          triggered_by: history.triggered_by,
          event_note: history.event_note ?? undefined,
          occurred_at: toISOStringSafe(history.occurred_at),
        }),
      );
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
          id: seller.id,
          display_name: seller.display_name,
          status: seller.status,
        },
        order_status_histories:
          statusHistories.length > 0 ? statusHistories : undefined,
      };
    },
  );

  const orderAddresses: IShoppingOrderAddress[] = addresses.map(
    (address: (typeof addresses)[number]) => ({
      id: address.id,
      shopping_order_id: address.shopping_order_id,
      type: address.type,
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      zip_code: address.zip_code,
      base_address: address.base_address,
      detail_address: address.detail_address ?? undefined,
      city: address.city,
      state_province: address.state_province,
      country: address.country,
      created_at: toISOStringSafe(address.created_at),
      updated_at: toISOStringSafe(address.updated_at),
    }),
  );

  const orderStatusHistory: IShoppingOrderStatusHistory[] =
    status_histories.map((history: (typeof status_histories)[number]) => ({
      id: history.id,
      shopping_order_id: history.shopping_order_id,
      shopping_order_split_id: history.shopping_order_split_id ?? undefined,
      from_status: history.from_status,
      to_status: history.to_status,
      triggered_by: history.triggered_by,
      event_note: history.event_note ?? undefined,
      occurred_at: toISOStringSafe(history.occurred_at),
    }));

  const orderPaymentAttempts: IShoppingOrderPaymentAttempt[] =
    payment_attempts.map((attempt: (typeof payment_attempts)[number]) => ({
      id: attempt.id,
      payment_reference: attempt.payment_reference ?? undefined,
      attempt_status: attempt.attempt_status as
        | "pending"
        | "completed"
        | "failed"
        | "cancelled",
      amount: attempt.amount,
      attempted_at: toISOStringSafe(attempt.attempted_at),
      completed_at: attempt.completed_at
        ? toISOStringSafe(attempt.completed_at)
        : undefined,
    }));

  const shipmentSellerIds = shipments.map(
    (s: (typeof shipments)[number]) => s.shopping_seller_id,
  );
  const shipmentSellers = await MyGlobal.prisma.shopping_sellers.findMany({
    where: { id: { in: shipmentSellerIds } },
  });
  const orderShipments: IShoppingOrderShipment[] = shipments.map(
    (shipment: (typeof shipments)[number]) => {
      const seller = shipmentSellers.find(
        (s) => s.id === shipment.shopping_seller_id,
      )!;
      return {
        id: shipment.id,
        seller: {
          id: seller.id,
          display_name: seller.display_name,
          status: seller.status,
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
      };
    },
  );

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
    addresses: orderAddresses,
    status_history: orderStatusHistory,
    payment_attempts: orderPaymentAttempts,
    shipments: orderShipments,
  };
}
