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

export async function deleteShoppingSellerOrdersOrderCode(props: {
  seller: SellerPayload;
  orderCode: string;
}): Promise<IShoppingOrder> {
  // Fetch the order by unique order_code (must be active)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
  });
  if (!order)
    throw new HttpException("Order not found or already deleted", 404);

  // Only allow delete if seller owns at least one line
  const orderLineRows = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: {
      shopping_order_id: order.id,
      deleted_at: null,
    },
  });
  const owns = orderLineRows.some(
    (line) => line.shopping_seller_id === props.seller.id,
  );
  if (!owns) throw new HttpException("You do not own this order", 403);

  // Only allow delete if order is in 'pending' status
  if (order.status !== "pending") {
    throw new HttpException("Order cannot be deleted unless pending", 400);
  }

  const deletedAt = toISOStringSafe(new Date());
  // Soft delete order
  await MyGlobal.prisma.shopping_orders.update({
    where: { id: order.id },
    data: {
      deleted_at: deletedAt,
      status: "cancelled",
      updated_at: deletedAt,
    },
  });
  // Add status history entry (requires id)
  await MyGlobal.prisma.shopping_order_status_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_order_id: order.id,
      from_status: order.status,
      to_status: "cancelled",
      triggered_by: "seller",
      event_note: "Order soft-deleted by seller",
      occurred_at: deletedAt,
    },
  });

  // Reload single order
  const updatedOrder = await MyGlobal.prisma.shopping_orders.findUniqueOrThrow({
    where: { id: order.id },
  });

  // Fetch customer info
  const customer = await MyGlobal.prisma.shopping_customers.findUniqueOrThrow({
    where: { id: updatedOrder.shopping_customer_id },
  });

  // Fetch order lines and fill out full nested structure
  const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: { shopping_order_id: updatedOrder.id },
  });

  // Get SKUs and sellers for order lines
  const [orderLineSKUs, orderLineSellers] = await Promise.all([
    MyGlobal.prisma.shopping_skus.findMany({
      where: { id: { in: orderLines.map((l) => l.shopping_sku_id) } },
    }),
    MyGlobal.prisma.shopping_sellers.findMany({
      where: { id: { in: orderLines.map((l) => l.shopping_seller_id) } },
    }),
  ]);
  // get fulfillments for all lines
  const allLineIds = orderLines.map((l) => l.id);
  const fulfillments =
    await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { shopping_order_line_id: { in: allLineIds } },
    });
  // get seller addresses for fulfillments
  const sellerAddressIds = Array.from(
    new Set(fulfillments.map((f) => f.shopping_seller_address_id)),
  );
  // Map orderLines
  const mappedOrderLines: IShoppingOrderLine[] = orderLines.map((line) => {
    const sku = orderLineSKUs.find((sku) => sku.id === line.shopping_sku_id)!;
    const seller = orderLineSellers.find(
      (s) => s.id === line.shopping_seller_id,
    )!;
    const lineFulfillments = fulfillments
      .filter((f) => f.shopping_order_line_id === line.id)
      .map((f) => ({
        id: f.id,
        fulfillment_code: f.fulfillment_code,
        quantity_fulfilled: f.quantity_fulfilled as number & tags.Type<"int32">,
        status: f.status,
        fulfilled_at: toISOStringSafe(f.fulfilled_at),
        seller_address_id: f.shopping_seller_address_id,
      }));
    return {
      id: line.id,
      sku: {
        id: sku.id,
        sku_code: sku.sku_code,
        price: sku.price,
        is_active: sku.is_active,
        status: sku.status,
      },
      quantity: line.quantity as number & tags.Type<"int32"> & tags.Minimum<1>,
      unit_price: line.unit_price,
      status: line.status,
      seller: {
        id: seller.id,
        display_name: seller.display_name,
        status: seller.status,
      },
      fulfillments: lineFulfillments,
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at: line.deleted_at
        ? toISOStringSafe(line.deleted_at)
        : undefined,
    };
  });

  // Order splits
  const splits = await MyGlobal.prisma.shopping_order_splits.findMany({
    where: { shopping_order_id: updatedOrder.id },
  });
  const splitSellers = splits.length
    ? await MyGlobal.prisma.shopping_sellers.findMany({
        where: { id: { in: splits.map((s) => s.shopping_seller_id) } },
      })
    : [];
  const allSplitIds = splits.map((s) => s.id);
  const splitStatusHistories = allSplitIds.length
    ? await MyGlobal.prisma.shopping_order_status_histories.findMany({
        where: { shopping_order_split_id: { in: allSplitIds } },
      })
    : [];
  const mappedSplits: IShoppingOrderSplit[] = splits.map((split) => {
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
      seller: (() => {
        const seller = splitSellers.find(
          (s) => s.id === split.shopping_seller_id,
        );
        return {
          id: seller!.id,
          display_name: seller!.display_name,
          status: seller!.status,
        };
      })(),
      order_status_histories: splitStatusHistories
        .filter((h) => h.shopping_order_split_id === split.id)
        .map((hist) => ({
          id: hist.id,
          from_status: hist.from_status,
          to_status: hist.to_status,
          triggered_by: hist.triggered_by,
          event_note:
            typeof hist.event_note === "string" ? hist.event_note : undefined,
          occurred_at: toISOStringSafe(hist.occurred_at),
        })),
    };
  });
  // Addresses
  const addresses = await MyGlobal.prisma.shopping_order_addresses.findMany({
    where: { shopping_order_id: updatedOrder.id },
  });
  const mappedAddresses: IShoppingOrderAddress[] = addresses.map((a) => ({
    id: a.id,
    shopping_order_id: a.shopping_order_id,
    type: a.type,
    recipient_name: a.recipient_name,
    recipient_phone: a.recipient_phone,
    zip_code: a.zip_code,
    base_address: a.base_address,
    detail_address:
      typeof a.detail_address === "string" ? a.detail_address : undefined,
    city: a.city,
    state_province: a.state_province,
    country: a.country,
    created_at: toISOStringSafe(a.created_at),
    updated_at: toISOStringSafe(a.updated_at),
  }));
  // Status history (order/global)
  const statusHistoryRows =
    await MyGlobal.prisma.shopping_order_status_histories.findMany({
      where: { shopping_order_id: updatedOrder.id },
    });
  const mappedStatusHistory: IShoppingOrderStatusHistory[] =
    statusHistoryRows.map((s) => ({
      id: s.id,
      shopping_order_id: s.shopping_order_id,
      shopping_order_split_id: s.shopping_order_split_id
        ? s.shopping_order_split_id
        : undefined,
      from_status: s.from_status,
      to_status: s.to_status,
      triggered_by: s.triggered_by,
      event_note: typeof s.event_note === "string" ? s.event_note : undefined,
      occurred_at: toISOStringSafe(s.occurred_at),
    }));
  // Payment attempts
  const paymentAttemptsRows =
    await MyGlobal.prisma.shopping_payment_attempts.findMany({
      where: { shopping_order_id: updatedOrder.id },
    });
  const mappedPaymentAttempts: IShoppingOrderPaymentAttempt[] =
    paymentAttemptsRows.map((p) => ({
      id: p.id,
      payment_reference:
        typeof p.payment_reference === "string"
          ? p.payment_reference
          : undefined,
      attempt_status: p.attempt_status as
        | "pending"
        | "completed"
        | "failed"
        | "cancelled",
      amount: p.amount,
      attempted_at: toISOStringSafe(p.attempted_at),
      completed_at: p.completed_at
        ? toISOStringSafe(p.completed_at)
        : undefined,
    }));
  // Shipments
  const shipmentRows = await MyGlobal.prisma.shopping_shipments.findMany({
    where: { shopping_order_id: updatedOrder.id },
  });
  const shipmentSellerIds = shipmentRows.map((row) => row.shopping_seller_id);
  const shipmentSellers = shipmentSellerIds.length
    ? await MyGlobal.prisma.shopping_sellers.findMany({
        where: { id: { in: shipmentSellerIds } },
      })
    : [];
  const mappedShipments: IShoppingOrderShipment[] = shipmentRows.map((s) => {
    const seller = shipmentSellers.find(
      (row) => row.id === s.shopping_seller_id,
    )!;
    return {
      id: s.id,
      seller: {
        id: seller.id,
        display_name: seller.display_name,
        status: seller.status,
      },
      code: s.code,
      status: s.status,
      carrier_company: s.carrier_company,
      scheduled_dispatch_at: s.scheduled_dispatch_at
        ? toISOStringSafe(s.scheduled_dispatch_at)
        : undefined,
      dispatched_at: s.dispatched_at
        ? toISOStringSafe(s.dispatched_at)
        : undefined,
      delivered_at: s.delivered_at
        ? toISOStringSafe(s.delivered_at)
        : undefined,
      canceled_at: s.canceled_at ? toISOStringSafe(s.canceled_at) : undefined,
      created_at: toISOStringSafe(s.created_at),
      updated_at: toISOStringSafe(s.updated_at),
    };
  });
  // Compose response
  return {
    id: updatedOrder.id,
    order_code: updatedOrder.order_code,
    total_price: updatedOrder.total_price,
    status: updatedOrder.status,
    created_at: toISOStringSafe(updatedOrder.created_at),
    updated_at: toISOStringSafe(updatedOrder.updated_at),
    deleted_at: updatedOrder.deleted_at
      ? toISOStringSafe(updatedOrder.deleted_at)
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
    order_lines: mappedOrderLines,
    order_splits: mappedSplits,
    addresses: mappedAddresses,
    status_history: mappedStatusHistory,
    payment_attempts: mappedPaymentAttempts,
    shipments: mappedShipments,
  };
}
