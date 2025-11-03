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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerInventorySkuCodeAlerts(props: {
  seller: SellerPayload;
  skuCode: string;
  body: IShoppingInventoryAlert.IRequest;
}): Promise<IPageIShoppingInventoryAlert> {
  const { seller, skuCode, body } = props;

  // Find SKU owned by seller and not soft-deleted
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: skuCode,
      deleted_at: null,
      product: {
        shopping_seller_id: seller.id,
        deleted_at: null,
      },
    },
    include: {
      product: true,
    },
  });
  if (!sku) {
    // SKU does not exist or not owned by seller, return empty result
    return {
      pagination: {
        current: Number(body.page),
        limit: Number(body.limit),
        records: 0,
        pages: 1,
      },
      data: [],
    };
  }

  // Build Prisma WHERE filters
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
    ...((body.triggered_at_from !== undefined &&
      body.triggered_at_from !== null) ||
    (body.triggered_at_to !== undefined && body.triggered_at_to !== null)
      ? {
          triggered_at: {
            ...(body.triggered_at_from !== undefined &&
              body.triggered_at_from !== null && {
                gte: body.triggered_at_from,
              }),
            ...(body.triggered_at_to !== undefined &&
              body.triggered_at_to !== null && { lte: body.triggered_at_to }),
          },
        }
      : {}),
    ...((body.resolved_at_from !== undefined &&
      body.resolved_at_from !== null) ||
    (body.resolved_at_to !== undefined && body.resolved_at_to !== null)
      ? {
          resolved_at: {
            ...(body.resolved_at_from !== undefined &&
              body.resolved_at_from !== null && { gte: body.resolved_at_from }),
            ...(body.resolved_at_to !== undefined &&
              body.resolved_at_to !== null && { lte: body.resolved_at_to }),
          },
        }
      : {}),
    ...(body.context !== undefined &&
      body.context !== null &&
      body.context.length > 0 && {
        context_note: {
          contains: body.context,
        },
      }),
  };

  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;
  const orderBy = [{ [body.sort_by]: body.sort_order }];

  const [records, alerts] = await Promise.all([
    MyGlobal.prisma.shopping_inventory_alerts.count({ where }),
    MyGlobal.prisma.shopping_inventory_alerts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(records / limit));
  const data = alerts.map((alert) => ({
    id: alert.id,
    shopping_sku_id: alert.shopping_sku_id,
    alert_type: alert.alert_type,
    resolved: alert.resolved,
    triggered_at: toISOStringSafe(alert.triggered_at),
    resolved_at: alert.resolved_at ? toISOStringSafe(alert.resolved_at) : null,
    resolved_actor_type: alert.resolved_actor_type ?? null,
    resolved_actor_id: alert.resolved_actor_id ?? null,
    context_note: alert.context_note ?? null,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: pages,
    },
    data: data,
  };
}
