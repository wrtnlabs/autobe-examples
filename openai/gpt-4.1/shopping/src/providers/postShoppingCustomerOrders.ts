import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingOrder.ICreate;
}): Promise<IShoppingOrder> {
  const now = toISOStringSafe(new Date());
  const { customer, body } = props;

  // Validate SKUs and sufficient inventory
  const skuIds = body.order_lines.map((l) => l.shopping_sku_id);
  const skus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: skuIds }, is_active: true, deleted_at: null },
  });
  if (skus.length !== skuIds.length) {
    throw new HttpException(
      "One or more SKUs are invalid, inactive, or deleted",
      400,
    );
  }
  // Fetch products in batch and resolve seller mapping
  const productIds = Array.from(
    new Set(skus.map((sku) => sku.shopping_product_id)),
  );
  const products = await MyGlobal.prisma.shopping_products.findMany({
    where: { id: { in: productIds }, deleted_at: null },
    select: {
      id: true,
      shopping_seller_id: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  // Build map from sku id to seller id via product
  const skuToSellerId = new Map<string, string>();
  for (const sku of skus) {
    const prod = productMap.get(sku.shopping_product_id);
    if (!prod)
      throw new HttpException("SKU product invalid or unavailable", 400);
    skuToSellerId.set(sku.id, prod.shopping_seller_id);
  }
  // Collect unique sellers
  const sellerIds: string[] = Array.from(
    new Set(Array.from(skuToSellerId.values())),
  );
  const sellers = await MyGlobal.prisma.shopping_sellers.findMany({
    where: { id: { in: sellerIds }, deleted_at: null },
  });
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  // Inventory check
  const inventoryRecords = await MyGlobal.prisma.shopping_inventory.findMany({
    where: { shopping_sku_id: { in: skuIds } },
  });
  const invMap = new Map(
    inventoryRecords.map((inv) => [inv.shopping_sku_id, inv]),
  );
  for (const line of body.order_lines) {
    const inventory = invMap.get(line.shopping_sku_id);
    if (!inventory || inventory.quantity < line.quantity) {
      throw new HttpException(
        "Insufficient inventory for SKU " + line.shopping_sku_id,
        409,
      );
    }
  }

  // Prepare splits (per seller)
  const splits: Array<{
    seller_id: string;
    order_lines: typeof body.order_lines;
    subtotal: number;
  }> = sellerIds.map((sid) => {
    const sellerLines = body.order_lines.filter(
      (l) => skuToSellerId.get(l.shopping_sku_id) === sid,
    );
    return {
      seller_id: sid,
      order_lines: sellerLines,
      subtotal: sellerLines.reduce(
        (sum, l) => sum + l.unit_price * l.quantity,
        0,
      ),
    };
  });

  // Generate IDs and codes
  const orderId = v4();
  const orderCodeSeq = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  const orderCode = `ORD-${now.slice(0, 10).replace(/-/g, "")}-${orderCodeSeq}`;

  // Transaction: Create all and decrement inventory
  const order = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdOrder = await tx.shopping_orders.create({
      data: {
        id: orderId,
        shopping_customer_id: customer.id,
        order_code: orderCode,
        total_price: body.total_price,
        status: "pending",
        created_at: now,
        updated_at: now,
      },
    });
    for (const line of body.order_lines) {
      const seller_id = skuToSellerId.get(line.shopping_sku_id)!;
      const orderLineId = v4();
      await tx.shopping_order_lines.create({
        data: {
          id: orderLineId,
          shopping_order_id: orderId,
          shopping_sku_id: line.shopping_sku_id,
          shopping_seller_id: seller_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          status: "pending",
          created_at: now,
          updated_at: now,
        },
      });
      const inv = invMap.get(line.shopping_sku_id);
      await tx.shopping_inventory.update({
        where: { id: inv!.id },
        data: { quantity: inv!.quantity - line.quantity, updated_at: now },
      });
      await tx.shopping_inventory_adjustments.create({
        data: {
          id: v4(),
          shopping_inventory_id: inv!.id,
          shopping_sku_id: line.shopping_sku_id,
          actor_type: "customer",
          actor_id: customer.id,
          reason_code: "order",
          quantity_before: inv!.quantity,
          quantity_after: inv!.quantity - line.quantity,
          adjustment_amount: -line.quantity,
          created_at: now,
        },
      });
    }
    for (const addr of body.shipping_addresses) {
      await tx.shopping_order_addresses.create({
        data: {
          id: v4(),
          shopping_order_id: orderId,
          type: addr.type,
          recipient_name: addr.recipient_name,
          recipient_phone: addr.recipient_phone,
          zip_code: addr.zip_code,
          base_address: addr.base_address,
          detail_address: addr.detail_address ?? null,
          city: addr.city,
          state_province: addr.state_province,
          country: addr.country,
          created_at: now,
          updated_at: now,
        },
      });
    }
    for (const s of splits) {
      await tx.shopping_order_splits.create({
        data: {
          id: v4(),
          shopping_order_id: orderId,
          shopping_seller_id: s.seller_id,
          split_code: `${orderCode}-${v4().slice(0, 6)}`,
          subtotal_price: s.subtotal,
          status: "pending",
          created_at: now,
          updated_at: now,
        },
      });
    }
    await tx.shopping_payment_attempts.create({
      data: {
        id: v4(),
        shopping_order_id: orderId,
        payment_reference: null,
        attempt_status: "pending",
        amount: body.total_price,
        attempted_at: now,
        completed_at: null,
      },
    });
    await tx.shopping_order_status_histories.create({
      data: {
        id: v4(),
        shopping_order_id: orderId,
        shopping_order_split_id: null,
        from_status: "",
        to_status: "pending",
        triggered_by: "customer",
        event_note: null,
        occurred_at: now,
      },
    });
    return createdOrder;
  });

  // Fetch order and join all response data
  const dbOrder = await MyGlobal.prisma.shopping_orders.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      customer: true,
      shopping_order_lines: true,
      shopping_order_splits: true,
      shopping_order_addresses: true,
      shopping_order_status_histories: true,
      shopping_payment_attempts: true,
      shopping_shipments: true,
    },
  });

  const customerSummary = {
    id: dbOrder.customer.id,
    name: dbOrder.customer.name,
    email: dbOrder.customer.email,
    is_active: dbOrder.customer.is_active,
    created_at: toISOStringSafe(dbOrder.customer.created_at),
    deleted_at: dbOrder.customer.deleted_at
      ? toISOStringSafe(dbOrder.customer.deleted_at)
      : null,
  };
  // Rebuild skuMap for response composition
  const dbSkuIds = dbOrder.shopping_order_lines.map((l) => l.shopping_sku_id);
  const dbSkus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: dbSkuIds } },
  });
  const skuMap = new Map(dbSkus.map((sku) => [sku.id, sku]));

  const orderLines = dbOrder.shopping_order_lines.map((line) => {
    const sku = skuMap.get(line.shopping_sku_id)!;
    const sellerId = skuToSellerId.get(line.shopping_sku_id)!;
    const seller = sellerMap.get(sellerId)!;
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
      fulfillments: [],
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at: line.deleted_at
        ? toISOStringSafe(line.deleted_at)
        : undefined,
    };
  });
  const splitsFull = dbOrder.shopping_order_splits.map((split) => {
    const seller = sellerMap.get(split.shopping_seller_id)!;
    const splitStatusHistories = dbOrder.shopping_order_status_histories
      .filter((h) => h.shopping_order_split_id === split.id)
      .map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        triggered_by: h.triggered_by,
        event_note: h.event_note ?? undefined,
        occurred_at: toISOStringSafe(h.occurred_at),
      }));
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
        splitStatusHistories.length > 0 ? splitStatusHistories : undefined,
    };
  });
  const addresses = dbOrder.shopping_order_addresses.map((addr) => ({
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
  const statusHistory = dbOrder.shopping_order_status_histories.map((h) => ({
    id: h.id,
    shopping_order_id: h.shopping_order_id,
    shopping_order_split_id: h.shopping_order_split_id ?? undefined,
    from_status: h.from_status,
    to_status: h.to_status,
    triggered_by: h.triggered_by,
    event_note: h.event_note ?? undefined,
    occurred_at: toISOStringSafe(h.occurred_at),
  }));
  const paymentAttempts = dbOrder.shopping_payment_attempts.map((pa) => ({
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
  }));
  const shipments = dbOrder.shopping_shipments.map((sh) => ({
    id: sh.id,
    seller: {
      id: sh.shopping_seller_id,
      display_name: sellerMap.get(sh.shopping_seller_id)?.display_name ?? "",
      status: sellerMap.get(sh.shopping_seller_id)?.status ?? "",
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
    id: dbOrder.id,
    order_code: dbOrder.order_code,
    total_price: dbOrder.total_price,
    status: dbOrder.status,
    created_at: toISOStringSafe(dbOrder.created_at),
    updated_at: toISOStringSafe(dbOrder.updated_at),
    deleted_at: dbOrder.deleted_at
      ? toISOStringSafe(dbOrder.deleted_at)
      : undefined,
    customer: customerSummary,
    order_lines: orderLines,
    order_splits: splitsFull,
    addresses,
    status_history: statusHistory,
    payment_attempts: paymentAttempts,
    shipments,
  };
}
