import { IEcommerceMallShipmentMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShipmentsMetrics(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallShipmentMetric> {
  const sellerId = props.seller.id;
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      seller_id: sellerId,
      deleted_at: null,
    },
  });
  const totalShipments = shipments.length;
  const shippedCount = shipments.filter((s) => s.status === "shipped").length;
  const deliveredCount = shipments.filter(
    (s) => s.status === "delivered",
  ).length;
  const statusDistribution = {
    shipped: shippedCount,
    delivered: deliveredCount,
  };
  const shipmentIds = shipments.map((s) => s.id);
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: {
        ecommerce_mall_shipment_id: {
          in: shipmentIds.length > 0 ? shipmentIds : [],
        },
        deleted_at: null,
      },
    });
  const totalItemsShipped = shipmentItems.reduce(
    (sum, item) => sum + (item.quantity_shipped ?? 0),
    0,
  );
  const deliveryRate =
    totalShipments > 0 ? (deliveredCount / totalShipments) * 100 : 0;
  const deliveredShipments = shipments.filter(
    (s) =>
      s.status === "delivered" &&
      s.delivered_at !== null &&
      s.shipped_at !== null,
  );
  let averageDeliveryDurationDays: (number & tags.Minimum<0>) | null = null;
  if (deliveredShipments.length > 0) {
    const totalDays = deliveredShipments.reduce(
      (sum, shipment) =>
        sum +
        (shipment.delivered_at!.getTime() - shipment.shipped_at!.getTime()) /
          (1000 * 60 * 60 * 24),
      0,
    );
    averageDeliveryDurationDays = totalDays / deliveredShipments.length;
  }
  const shipmentsWithShippedAt = shipments.filter((s) => s.shipped_at !== null);
  let averageProcessingTimeDays: (number & tags.Minimum<0>) | null = null;
  if (shipmentsWithShippedAt.length > 0) {
    const totalDays = shipmentsWithShippedAt.reduce(
      (sum, shipment) =>
        sum +
        (shipment.shipped_at!.getTime() - shipment.created_at.getTime()) /
          (1000 * 60 * 60 * 24),
      0,
    );
    averageProcessingTimeDays = totalDays / shipmentsWithShippedAt.length;
  }
  return {
    total_shipments: totalShipments,
    status_distribution: statusDistribution,
    total_items_shipped: totalItemsShipped,
    delivery_rate: deliveryRate,
    average_delivery_duration_days: averageDeliveryDurationDays,
    average_processing_time_days: averageProcessingTimeDays,
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
// export async function getEcommerceMallSellerShipmentsMetrics(props: {
//   seller: SellerPayload;
// }): Promise<IEcommerceMallShipmentMetric> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------