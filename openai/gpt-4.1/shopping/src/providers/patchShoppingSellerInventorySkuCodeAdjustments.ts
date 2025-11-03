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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerInventorySkuCodeAdjustments(props: {
  seller: SellerPayload;
  skuCode: string;
  body: IShoppingInventoryAdjustment.IRequest;
}): Promise<IPageIShoppingInventoryAdjustment> {
  const { seller, skuCode, body } = props;
  // Step 1: Lookup SKU and enforce seller ownership
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: skuCode,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }
  // Check ownership: get parent product, verify seller
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: { id: sku.shopping_product_id, shopping_seller_id: seller.id },
  });
  if (!product) {
    throw new HttpException("Unauthorized - seller does not own this SKU", 403);
  }
  // Step 2: Build Prisma where clause for adjustment filters
  const baseWhere: Record<string, any> = { shopping_sku_id: sku.id };
  if (body.actor_type !== undefined) baseWhere.actor_type = body.actor_type;
  if (body.reason_code !== undefined) baseWhere.reason_code = body.reason_code;
  if (body.context !== undefined)
    baseWhere.context_note = { contains: body.context };

  // Date range filter
  if (body.date_from !== undefined && body.date_to !== undefined) {
    baseWhere.created_at = { gte: body.date_from, lte: body.date_to };
  } else if (body.date_from !== undefined) {
    baseWhere.created_at = { gte: body.date_from };
  } else if (body.date_to !== undefined) {
    baseWhere.created_at = { lte: body.date_to };
  }
  // Adjustment min/max
  if (body.adjustment_min !== undefined && body.adjustment_max !== undefined) {
    baseWhere.adjustment_amount = {
      gte: body.adjustment_min,
      lte: body.adjustment_max,
    };
  } else if (body.adjustment_min !== undefined) {
    baseWhere.adjustment_amount = { gte: body.adjustment_min };
  } else if (body.adjustment_max !== undefined) {
    baseWhere.adjustment_amount = { lte: body.adjustment_max };
  }
  // Sorting
  const sortField =
    body.sort_by === "adjustment_amount" ? "adjustment_amount" : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";
  // Pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  // Step 3: Query adjustments and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_inventory_adjustments.findMany({
      where: baseWhere,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_inventory_adjustments.count({ where: baseWhere }),
  ]);
  // Step 4: Format adjustments as DTOs
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_inventory_id: row.shopping_inventory_id,
      shopping_sku_id: row.shopping_sku_id,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      reason_code: row.reason_code,
      quantity_before: row.quantity_before,
      quantity_after: row.quantity_after,
      adjustment_amount: row.adjustment_amount,
      context_note: row.context_note ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
