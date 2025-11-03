import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import { IPageIShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLowStockAlert";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminLowStockAlerts(props: {
  admin: AdminPayload;
  body: IShoppingMallLowStockAlert.IRequest;
}): Promise<IPageIShoppingMallLowStockAlert.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const safeLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * safeLimit;

  const where = {
    ...(body.resolved !== undefined && { resolved: body.resolved }),
    ...(body.shopping_mall_product_sku_id !== undefined &&
      body.shopping_mall_product_sku_id !== null && {
        shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      }),
  };

  const [alerts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_low_stock_alerts.findMany({
      where: where,
      orderBy: { alerted_at: "desc" },
      skip: skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.shopping_mall_low_stock_alerts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: alerts.map((alert) => ({
      id: alert.id,
      shopping_mall_product_sku_id: alert.shopping_mall_product_sku_id,
      alerted_at: toISOStringSafe(alert.alerted_at),
      resolved: alert.resolved,
      resolved_at: alert.resolved_at
        ? toISOStringSafe(alert.resolved_at)
        : null,
    })),
  };
}
