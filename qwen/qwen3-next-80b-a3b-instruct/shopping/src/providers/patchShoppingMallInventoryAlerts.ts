import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";
import { IPageIShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAlert";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallInventoryAlerts(props: {
  body: IShoppingMallInventoryAlert.IRequest;
}): Promise<IPageIShoppingMallInventoryAlert> {
  const { alert_type, status, seller_id, alerted_at_from, alerted_at_to } =
    props.body;

  // Build complex where condition inline for type safety
  const whereCondition = {
    // Base filters
    ...(alert_type && { alert_type }),
    ...(status && { status }),
    ...(seller_id && { seller_id }),

    // Date range conditions
    ...(alerted_at_from || alerted_at_to
      ? {
          alerted_at: {
            ...((alerted_at_from && { gte: alerted_at_from }) || {}),
            ...((alerted_at_to && { lte: alerted_at_to }) || {}),
          },
        }
      : {}),
  };

  // Pagination parameters - use defaults from standard pagination (page 1, limit 100)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Fetch data and count in parallel
  const [alerts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_alerts.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { alerted_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_inventory_alerts.count({
      where: whereCondition,
    }),
  ]);

  // Map results to DTO format with proper date formatting
  const data = alerts.map((alert) => ({
    id: alert.id,
    inventory_unit_id: alert.inventory_unit_id,
    seller_id: alert.seller_id,
    alert_type: alert.alert_type satisfies string as
      | "low_stock"
      | "critical_stock"
      | "back_in_stock",
    threshold: alert.threshold,
    current_stock: alert.current_stock,
    alerted_at: toISOStringSafe(alert.alerted_at),
    cleared_at:
      alert.cleared_at === null ? null : toISOStringSafe(alert.cleared_at),
    status: alert.status satisfies string as "active" | "cleared",
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
