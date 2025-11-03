import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";
import { IPageIShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventoryAlert";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminInventorySkuCodeAlerts(props: {
  admin: AdminPayload;
  skuCode: string;
  body: IShoppingInventoryAlert.IRequest;
}): Promise<IPageIShoppingInventoryAlert> {
  const { skuCode, body } = props;

  // 1. Lookup SKU ID by skuCode
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: skuCode },
    select: { id: true },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // 2. Build where clause
  const triggered_at =
    (body.triggered_at_from !== undefined && body.triggered_at_from !== null) ||
    (body.triggered_at_to !== undefined && body.triggered_at_to !== null)
      ? {
          ...(body.triggered_at_from !== undefined &&
            body.triggered_at_from !== null && {
              gte: body.triggered_at_from,
            }),
          ...(body.triggered_at_to !== undefined &&
            body.triggered_at_to !== null && {
              lte: body.triggered_at_to,
            }),
        }
      : undefined;

  const resolved_at =
    (body.resolved_at_from !== undefined && body.resolved_at_from !== null) ||
    (body.resolved_at_to !== undefined && body.resolved_at_to !== null)
      ? {
          ...(body.resolved_at_from !== undefined &&
            body.resolved_at_from !== null && {
              gte: body.resolved_at_from,
            }),
          ...(body.resolved_at_to !== undefined &&
            body.resolved_at_to !== null && {
              lte: body.resolved_at_to,
            }),
        }
      : undefined;

  const where = {
    shopping_sku_id: sku.id,
    deleted_at: null,
    ...(body.alert_type !== undefined &&
      body.alert_type !== null && {
        alert_type: body.alert_type,
      }),
    ...(body.resolved !== undefined &&
      body.resolved !== null && {
        resolved: body.resolved,
      }),
    ...(triggered_at !== undefined &&
      Object.keys(triggered_at).length > 0 && {
        triggered_at,
      }),
    ...(resolved_at !== undefined &&
      Object.keys(resolved_at).length > 0 && {
        resolved_at,
      }),
    ...(body.context !== undefined &&
      body.context !== null && {
        context_note: {
          contains: body.context,
        },
      }),
  };

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  const sortBy =
    body.sort_by === "resolved_at" ? "resolved_at" : "triggered_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [alerts, total] = await Promise.all([
    MyGlobal.prisma.shopping_inventory_alerts.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_inventory_alerts.count({ where }),
  ]);

  const data = alerts.map((alert) => ({
    id: alert.id,
    shopping_sku_id: alert.shopping_sku_id,
    alert_type: alert.alert_type,
    resolved: alert.resolved,
    triggered_at: toISOStringSafe(alert.triggered_at),
    resolved_at: alert.resolved_at ? toISOStringSafe(alert.resolved_at) : null,
    resolved_actor_type:
      alert.resolved_actor_type !== undefined &&
      alert.resolved_actor_type !== null
        ? alert.resolved_actor_type
        : null,
    resolved_actor_id:
      alert.resolved_actor_id !== undefined && alert.resolved_actor_id !== null
        ? alert.resolved_actor_id
        : null,
    context_note:
      alert.context_note !== undefined && alert.context_note !== null
        ? alert.context_note
        : null,
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
