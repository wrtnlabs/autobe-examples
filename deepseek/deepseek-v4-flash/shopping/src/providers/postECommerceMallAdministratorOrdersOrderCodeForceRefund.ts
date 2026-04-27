import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallOrderItemAtSummaryTransformer } from "../transformers/ECommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAdministratorOrdersOrderCodeForceRefund(props: {
  administrator: AdministratorPayload;
  orderCode: string;
  body: IECommerceMallOrder.IForceRefundRequest;
}): Promise<IECommerceMallOrder.IForceRefundResponse> {
  // ----------------------------------------------------------------
  // 1. RESOLVE ORDER BY CODE
  // ----------------------------------------------------------------
  const order = await MyGlobal.prisma.e_commerce_mall_orders.findUnique({
    where: { code: props.orderCode },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  const orderId = order.id;
  // ----------------------------------------------------------------
  // 2. LOAD TARGET ORDER ITEMS
  // ----------------------------------------------------------------
  const orderItemIds = props.body.orderItemIds;
  const hasFilter = orderItemIds !== undefined && orderItemIds.length > 0;
  const whereFilter: Prisma.e_commerce_mall_order_itemsWhereInput = {
    e_commerce_mall_order_id: orderId,
  };
  if (hasFilter === true) {
    whereFilter.id = { in: orderItemIds };
  }
  const orderItems = await MyGlobal.prisma.e_commerce_mall_order_items.findMany(
    {
      where: whereFilter,
      select: {
        id: true,
        e_commerce_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    },
  );
  // ----------------------------------------------------------------
  // 3. DETECT CROSS-ORDER REQUESTED IDS
  // ----------------------------------------------------------------
  const foundIdsSet = new Set(orderItems.map((item) => item.id));
  const requestedIdsNotInOrder: string[] = [];
  if (hasFilter === true) {
    for (const id of orderItemIds) {
      if (foundIdsSet.has(id) === false) {
        requestedIdsNotInOrder.push(id);
      }
    }
  }
  // Query cross-order / non-existent items
  const crossOrderItems: Array<{
    id: string;
    doesExist: boolean;
  }> = [];
  if (requestedIdsNotInOrder.length > 0) {
    const otherItems =
      await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
        where: { id: { in: requestedIdsNotInOrder } },
        select: { id: true },
      });
    const otherItemIdsSet = new Set(otherItems.map((i) => i.id));
    for (const id of requestedIdsNotInOrder) {
      crossOrderItems.push({
        id,
        doesExist: otherItemIdsSet.has(id),
      });
    }
  }
  // ----------------------------------------------------------------
  // 4. ATOMIC TRANSACTION — REFUND ELIGIBLE ITEMS
  // ----------------------------------------------------------------
  const refundedItemIds: string[] = [];
  const skippedTerminalItems: string[] = [];
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    for (const item of orderItems) {
      if (item.status === "cancelled" || item.status === "refunded") {
        skippedTerminalItems.push(item.id);
        continue;
      }
      // (a) Update order item status to refunded
      await tx.e_commerce_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // (b) Create status transition log
      await tx.e_commerce_mall_order_item_status_logs.create({
        data: {
          id: v4(),
          e_commerce_mall_order_item_id: item.id,
          from_status: item.status,
          to_status: "refunded",
          reason: "administrator_force_refund",
          created_at: now,
          updated_at: now,
        },
      });
      // (c) Create inventory record to restore stock
      await tx.e_commerce_mall_inventory_records.create({
        data: {
          id: v4(),
          e_commerce_mall_product_variant_id:
            item.e_commerce_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: "force-refunded",
          created_at: now,
        },
      });
      refundedItemIds.push(item.id);
    }
  });
  // ----------------------------------------------------------------
  // 5. RE-QUERY REFUNDED ITEMS FOR RESPONSE
  // ----------------------------------------------------------------
  const refundedRecords =
    refundedItemIds.length > 0
      ? await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
          where: { id: { in: refundedItemIds } },
          ...ECommerceMallOrderItemAtSummaryTransformer.select(),
        })
      : [];
  const refundedItems = await ArrayUtil.asyncMap(
    refundedRecords,
    ECommerceMallOrderItemAtSummaryTransformer.transform,
  );
  // ----------------------------------------------------------------
  // 6. BUILD SKIPPED ITEMS LIST
  // ----------------------------------------------------------------
  const allSkippedSummaryIds = [
    ...skippedTerminalItems,
    ...crossOrderItems.filter((c) => c.doesExist === true).map((c) => c.id),
  ];
  const skippedRecords =
    allSkippedSummaryIds.length > 0
      ? await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
          where: { id: { in: allSkippedSummaryIds } },
          ...ECommerceMallOrderItemAtSummaryTransformer.select(),
        })
      : [];
  const skippedRecordMap = new Map(skippedRecords.map((r) => [r.id, r]));
  const skippedItems: IECommerceMallOrder.IForceRefundSkippedItem[] = [];
  // Terminal items — already in cancelled/refunded state
  for (const id of skippedTerminalItems) {
    const record = skippedRecordMap.get(id);
    if (record !== undefined) {
      skippedItems.push({
        item: await ECommerceMallOrderItemAtSummaryTransformer.transform(
          record,
        ),
        reason: "already in terminal state",
      } satisfies IECommerceMallOrder.IForceRefundSkippedItem);
    }
  }
  // Cross-order items — exist but belong to a different order
  for (const entry of crossOrderItems) {
    if (entry.doesExist === true) {
      const record = skippedRecordMap.get(entry.id);
      if (record !== undefined) {
        skippedItems.push({
          item: await ECommerceMallOrderItemAtSummaryTransformer.transform(
            record,
          ),
          reason: "item does not belong to this order",
        } satisfies IECommerceMallOrder.IForceRefundSkippedItem);
      }
    }
    // Non-existent IDs are silently omitted — no DB record means no ISummary possible
  }
  // ----------------------------------------------------------------
  // 7. RETURN RESPONSE
  // ----------------------------------------------------------------
  return {
    refundedItems,
    skippedItems,
  } satisfies IECommerceMallOrder.IForceRefundResponse;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAdministratorOrdersOrderCodeForceRefund(props: {
//   administrator: AdministratorPayload;
//   orderCode: string;
//   body: IECommerceMallOrder.IForceRefundRequest;
// }): Promise<IECommerceMallOrder.IForceRefundResponse> {
//   return {
//     refundedItems: await ArrayUtil.asyncMap(..., (r) => ECommerceMallOrderItemAtSummaryTransformer.transform(r)),
//     skippedItems: ...,
//   };
// }
// ```
//--------------------------------------------------------------