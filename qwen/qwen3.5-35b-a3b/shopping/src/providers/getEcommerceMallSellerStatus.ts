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
  const orderStats = await MyGlobal.prisma.ecommerce_mall_orders.groupBy({
    by: ["status"],
    where: {
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  const shipmentStats = await MyGlobal.prisma.ecommerce_mall_shipments.groupBy({
    by: ["status"],
    where: {
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  const totalOrders = orderStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const deliveredOrders =
    orderStats.find((s) => s.status === "delivered")?._count.id ?? 0;
  const totalShipments = shipmentStats.reduce(
    (sum, stat) => sum + stat._count.id,
    0,
  );
  const deliveredShipments =
    shipmentStats.find((s) => s.status === "delivered")?._count.id ?? 0;
  const deliveryRatio = totalOrders > 0 ? deliveredOrders / totalOrders : 0;
  const shipmentDeliveryRatio =
    totalShipments > 0 ? deliveredShipments / totalShipments : 0;
  const availabilityPercentage = 100;
  const healthScore = Math.round(
    availabilityPercentage * 0.6 +
      deliveryRatio * 100 * 0.2 +
      shipmentDeliveryRatio * 100 * 0.2,
  );
  const platformStatus: "healthy" | "degraded" | "unhealthy" =
    healthScore >= 95
      ? "healthy"
      : healthScore >= 80
        ? "degraded"
        : "unhealthy";
  const orderCounts: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {};
  for (const stat of orderStats) {
    orderCounts[stat.status] = stat._count.id;
  }
  const shipmentCounts: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {};
  for (const stat of shipmentStats) {
    shipmentCounts[stat.status] = stat._count.id;
  }
  return {
    platformStatus,
    orderCounts,
    shipmentCounts,
    healthScore,
  } satisfies IEcommerceMallStatus.ISummary;
}
