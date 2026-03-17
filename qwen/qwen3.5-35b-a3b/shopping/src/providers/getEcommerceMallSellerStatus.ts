import { IEcommerceMallStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallStatus";
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

export async function getEcommerceMallSellerStatus(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallStatus.ISummary> {
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      deleted_at: null,
      status: {
        in: [
          "paid",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
          "partiallyCompleted",
        ],
      },
    },
    select: { status: true },
  });
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      deleted_at: null,
      status: { in: ["created", "inTransit", "delivered"] },
    },
    select: { status: true },
  });
  const orderCounts: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {};
  orders.forEach((order) => {
    if (order.status in orderCounts) {
      orderCounts[order.status] = (orderCounts[order.status] + 1) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    } else {
      orderCounts[order.status] = 1 as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    }
  });
  const shipmentCounts: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {};
  shipments.forEach((shipment) => {
    if (shipment.status in shipmentCounts) {
      shipmentCounts[shipment.status] = (shipmentCounts[shipment.status] +
        1) as number & tags.Type<"int32"> & tags.Minimum<0>;
    } else {
      shipmentCounts[shipment.status] = 1 as number &
        tags.Type<"int32"> &
        tags.Minimum<0>;
    }
  });
  const totalPaidOrders = orderCounts["paid"] || 0;
  const totalDeliveredOrders = orderCounts["delivered"] || 0;
  const totalCreatedShipments = shipmentCounts["created"] || 0;
  const totalDeliveredShipments = shipmentCounts["delivered"] || 0;
  const deliveryRateOrders =
    totalPaidOrders > 0 ? (totalDeliveredOrders / totalPaidOrders) * 100 : 0;
  const deliveryRateShipments =
    totalCreatedShipments > 0
      ? (totalDeliveredShipments / totalCreatedShipments) * 100
      : 0;
  const availabilityPercentage = 100;
  const healthScore =
    availabilityPercentage * 0.6 +
    deliveryRateOrders * 0.2 +
    deliveryRateShipments * 0.2;
  const cappedHealthScore = Math.min(Math.max(healthScore, 0), 100) as number &
    tags.Minimum<0> &
    tags.Maximum<100>;
  let platformStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (cappedHealthScore >= 95) {
    platformStatus = "healthy";
  } else if (cappedHealthScore >= 80) {
    platformStatus = "degraded";
  } else {
    platformStatus = "unhealthy";
  }
  return {
    platformStatus,
    orderCounts: Object.keys(orderCounts).length > 0 ? orderCounts : undefined,
    shipmentCounts:
      Object.keys(shipmentCounts).length > 0 ? shipmentCounts : undefined,
    healthScore: cappedHealthScore,
  } satisfies IEcommerceMallStatus.ISummary;
}
