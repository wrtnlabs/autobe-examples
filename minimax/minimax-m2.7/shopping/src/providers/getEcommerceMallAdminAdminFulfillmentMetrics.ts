import { IEcommerceMallShipmentMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminFulfillmentMetrics(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallShipmentMetric> {
  // 1. Order Statistics - group orders by status (exclude soft-deleted)
  const ordersGrouped = await MyGlobal.prisma.ecommerce_mall_orders.groupBy({
    by: ["status"],
    where: { deleted_at: null },
    _count: { id: true },
  });
  let totalOrders = 0;
  let paidOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let refundedOrders = 0;
  let partiallyCompletedOrders = 0;
  for (const group of ordersGrouped) {
    const count = group._count.id;
    totalOrders += count;
    switch (group.status) {
      case "paid":
        paidOrders = count;
        break;
      case "shipped":
        shippedOrders = count;
        break;
      case "delivered":
        deliveredOrders = count;
        break;
      case "cancelled":
        cancelledOrders = count;
        break;
      case "refunded":
        refundedOrders = count;
        break;
      case "partially_completed":
        partiallyCompletedOrders = count;
        break;
    }
  }
  // 2. Order Item Statistics
  const orderItemsGrouped =
    await MyGlobal.prisma.ecommerce_mall_order_items.groupBy({
      by: ["status"],
      _count: { id: true },
      _avg: { quantity: true },
    });
  let totalItems = 0;
  let paidItems = 0;
  let shippedItems = 0;
  let deliveredItems = 0;
  let cancelledItems = 0;
  let refundedItems = 0;
  let totalQuantity = 0;
  let quantityCount = 0;
  for (const group of orderItemsGrouped) {
    const count = group._count.id;
    totalItems += count;
    if (group._avg.quantity !== null) {
      const avgQty = group._avg.quantity;
      if (avgQty !== null) {
        totalQuantity += avgQty * count;
      }
      quantityCount += count;
    }
    switch (group.status) {
      case "paid":
        paidItems = count;
        break;
      case "shipped":
        shippedItems = count;
        break;
      case "delivered":
        deliveredItems = count;
        break;
      case "cancelled":
        cancelledItems = count;
        break;
      case "refunded":
        refundedItems = count;
        break;
    }
  }
  const averageQuantityPerItem: number | null =
    quantityCount > 0 ? totalQuantity / quantityCount : null;
  // 3. Shipment Statistics (exclude soft-deleted)
  const totalShipments = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: { deleted_at: null },
  });
  const totalItemsShipped =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.count();
  const averageItemsPerShipment: number | null =
    totalShipments > 0 ? totalItemsShipped / totalShipments : null;
  // 4. Fulfillment Performance - Calculate average fulfillment time
  const shippedItemsWithTime =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: { status: "shipped" },
      select: {
        created_at: true,
        order: {
          select: { created_at: true },
        },
      },
    });
  let totalFulfillmentTimeSeconds = 0;
  let shippedItemsForAvg = 0;
  for (const item of shippedItemsWithTime) {
    const orderCreatedAt = item.order.created_at;
    const itemCreatedAt = item.created_at;
    const diffMs = itemCreatedAt.getTime() - orderCreatedAt.getTime();
    totalFulfillmentTimeSeconds += diffMs / 1000;
    shippedItemsForAvg++;
  }
  const averageFulfillmentTimeSeconds: number | null =
    shippedItemsForAvg > 0
      ? totalFulfillmentTimeSeconds / shippedItemsForAvg
      : null;
  // 5. Calculate rates
  const deliveryCompletionRate: number | null =
    totalItems > 0 ? (deliveredItems + refundedItems) / totalItems : null;
  const cancellationRate: number | null =
    totalItems > 0 ? cancelledItems / totalItems : null;
  return {
    orderStatistics: {
      totalOrders,
      paidOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      partiallyCompletedOrders,
    },
    orderItemStatistics: {
      totalItems,
      paidItems,
      shippedItems,
      deliveredItems,
      cancelledItems,
      refundedItems,
      averageQuantityPerItem,
    },
    shipmentStatistics: {
      totalShipments,
      totalItemsShipped,
      averageItemsPerShipment,
    },
    fulfillmentPerformance: {
      averageFulfillmentTimeSeconds,
      deliveryCompletionRate,
      cancellationRate,
    },
  };
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
// import { IEcommerceMallShipmentMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentMetric";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminFulfillmentMetrics(props: {
//   admin: AdminPayload;
// }): Promise<IEcommerceMallShipmentMetric> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------