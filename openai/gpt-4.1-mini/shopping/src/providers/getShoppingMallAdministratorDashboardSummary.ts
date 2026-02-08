import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorDashboardSummary(props: {
  administrator: AdministratorPayload;
}): Promise<IShoppingMallDashboardSummary> {
  const totalSellers = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: { deleted_at: null },
  });
  const totalSales = await MyGlobal.prisma.shopping_mall_sales.count({
    where: { deleted_at: null },
  });
  const totalOrders = await MyGlobal.prisma.shopping_mall_orders.count({
    where: { deleted_at: null },
  });
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: { status: "pending" },
    });
  return {
    total_sellers: totalSellers,
    total_sales: totalSales,
    total_orders: totalOrders,
    pending_order_items: pendingOrderItems,
  };
}
