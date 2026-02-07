import { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
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

export async function getEcommerceAdminDashboards(props: {
  admin: AdminPayload;
}): Promise<IEcommerceSystemConfig> {
  const todayStart = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    ),
  );
  let systemStatus: "operational" | "degraded" | "critical" = "operational";
  const statuses = await MyGlobal.prisma.ecommerce_system_statuses.findMany({
    where: { deleted_at: { equals: null } },
    select: { status: true },
  });
  const healthyCount = statuses.filter((s) => s.status === "healthy").length;
  const warningCount = statuses.filter((s) => s.status === "warning").length;
  const unhealthyCount = statuses.filter(
    (s) => s.status === "unhealthy",
  ).length;
  if (unhealthyCount > 0) {
    systemStatus = "critical";
    if (warningCount > 0) {
      systemStatus = "degraded";
    }
  }
  const newOrdersToday = await MyGlobal.prisma.ecommerce_orders.count({
    where: {
      created_at: { gte: toISOStringSafe(todayStart) },
      deleted_at: { equals: null },
    },
  });
  const revenueAggregate = await MyGlobal.prisma.ecommerce_orders.aggregate({
    where: {
      created_at: { gte: toISOStringSafe(todayStart) },
      deleted_at: { equals: null },
    },
    _sum: { amount: true },
  });
  const revenueToday = revenueAggregate._sum.amount || 0;
  const activeSellers = await MyGlobal.prisma.ecommerce_sellers.count({
    where: { status: "active", deleted_at: { equals: null } },
  });
  const newSellersToday = await MyGlobal.prisma.ecommerce_sellers.count({
    where: {
      created_at: { gte: toISOStringSafe(todayStart) },
      status: "active",
      deleted_at: { equals: null },
    },
  });
  const newSellersRatio =
    activeSellers === 0
      ? "0%"
      : ((newSellersToday / activeSellers) * 100).toFixed(1) + "%";
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const statusChecks = await MyGlobal.prisma.ecommerce_system_statuses.findMany(
    {
      where: {
        last_check_timestamp: { gte: toISOStringSafe(last24Hours) },
        deleted_at: { equals: null },
      },
    },
  );
  const operationalCount = statusChecks.filter(
    (s) => s.status === "healthy",
  ).length;
  const totalChecks = statusChecks.length;
  const systemUptime =
    totalChecks > 0 ? ((operationalCount / totalChecks) * 100).toFixed(1) : 0;
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: { status: "pending", deleted_at: { equals: null } },
    });
  return {
    systemStatus,
    newOrdersToday,
    revenueToday: revenueToday as number,
    activeSellers,
    newSellersRatio,
    systemUptime: Number(systemUptime),
    pendingCancellations,
  };
}
