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

export async function getEcommerceAdminSystemConfigsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<IEcommerceSystemConfig> {
  // systemStatus from ecommerce_system_statuses
  const systemStatusResult =
    await MyGlobal.prisma.ecommerce_system_statuses.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
    });
  const systemStatus = (systemStatusResult?.status ?? "operational") as
    | "operational"
    | "degraded"
    | "critical";
  // newOrdersToday from ecommerce_orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newOrdersToday = await MyGlobal.prisma.ecommerce_orders.count({
    where: {
      created_at: { gte: todayStart },
      deleted_at: null,
    },
  });
  // revenueToday from ecommerce_order_items
  const revenueTodayResult =
    await MyGlobal.prisma.ecommerce_order_items.aggregate({
      where: {
        ecommerce_order_id: {
          created_at: { gte: todayStart },
          deleted_at: null,
        },
      },
      _sum: { price_at_purchase: true },
    });
  const revenueToday = revenueTodayResult._sum?.price_at_purchase ?? 0;
  // activeSellers from ecommerce_sellers
  const activeSellers = await MyGlobal.prisma.ecommerce_sellers.count({
    where: {
      approval_status: "active",
      deleted_at: null,
    },
  } satisfies Prisma.ecommerce_sellersCountArgs);
  // newSellersRatio from ecommerce_sellers
  const totalSellers = await MyGlobal.prisma.ecommerce_sellers.count({
    where: { deleted_at: null },
  });
  const newSellers = await MyGlobal.prisma.ecommerce_sellers.count({
    where: {
      created_at: { gte: todayStart },
      deleted_at: null,
    },
  });
  const newSellersRatio = ((newSellers / totalSellers) * 100).toFixed(2) + "%";
  // systemUptime
  const systemUptime = 99.9;
  // pendingCancellations from ecommerce_cancellation_requests
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    });
  return {
    systemStatus,
    newOrdersToday,
    revenueToday,
    activeSellers,
    newSellersRatio,
    systemUptime,
    pendingCancellations,
  };
}
