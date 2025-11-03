import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";
import { IPageIShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventoryAdjustment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminInventorySkuCodeAdjustments(props: {
  admin: AdminPayload;
  skuCode: string;
  body: IShoppingInventoryAdjustment.IRequest;
}): Promise<IPageIShoppingInventoryAdjustment> {
  // 1. Look up SKU by code
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: props.skuCode },
    select: { id: true },
  });
  if (!sku) throw new HttpException("SKU not found", 404);

  // 2. Look up inventory record for this SKU.
  const inventory = await MyGlobal.prisma.shopping_inventory.findUnique({
    where: { shopping_sku_id: sku.id },
    select: { id: true },
  });
  if (!inventory) throw new HttpException("No inventory record for SKU", 404);

  // 3. Build adjustment filters from props.body
  const where = {
    shopping_sku_id: sku.id,
    shopping_inventory_id: inventory.id,
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.reason_code !== undefined && {
      reason_code: props.body.reason_code,
    }),
    ...(props.body.context !== undefined && {
      context_note: { contains: props.body.context },
    }),
    ...((props.body.date_from !== undefined ||
      props.body.date_to !== undefined) && {
      created_at: {
        ...(props.body.date_from !== undefined && {
          gte: props.body.date_from,
        }),
        ...(props.body.date_to !== undefined && { lte: props.body.date_to }),
      },
    }),
    ...((props.body.adjustment_min !== undefined ||
      props.body.adjustment_max !== undefined) && {
      adjustment_amount: {
        ...(props.body.adjustment_min !== undefined && {
          gte: props.body.adjustment_min,
        }),
        ...(props.body.adjustment_max !== undefined && {
          lte: props.body.adjustment_max,
        }),
      },
    }),
  };

  // 4. Sorting/ordering
  const sortField =
    props.body.sort_by === "adjustment_amount"
      ? "adjustment_amount"
      : "created_at";
  const sortOrder = props.body.sort_direction === "asc" ? "asc" : "desc";

  // 5. Pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // 6. Query total
  const total = await MyGlobal.prisma.shopping_inventory_adjustments.count({
    where,
  });

  // 7. Query paged adjustment records
  const rows = await MyGlobal.prisma.shopping_inventory_adjustments.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    skip,
    take: limit,
  });

  // 8. Map to DTOs for response
  const data = rows.map((row) => ({
    id: row.id,
    shopping_inventory_id: row.shopping_inventory_id,
    shopping_sku_id: row.shopping_sku_id,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    reason_code: row.reason_code,
    quantity_before: row.quantity_before,
    quantity_after: row.quantity_after,
    adjustment_amount: row.adjustment_amount,
    context_note: row.context_note === undefined ? null : row.context_note,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
