import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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

export async function patchEcommerceMallSellerVariantsVariantIdInventoryHistory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  // Verify variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: { seller_id: props.seller.id, deleted_at: null },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found or access denied", 404);
  }
  // Build filter conditions
  const filterConditions: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    variant: {
      id: props.variantId,
      product: { seller_id: props.seller.id },
      deleted_at: null,
    },
  };
  if (props.body.startDate !== undefined) {
    if (filterConditions.timestamp === undefined) {
      filterConditions.timestamp = {};
    }
    (filterConditions.timestamp as any).gte = props.body.startDate;
  }
  if (props.body.endDate !== undefined) {
    if (filterConditions.timestamp === undefined) {
      filterConditions.timestamp = {};
    }
    (filterConditions.timestamp as any).lte = props.body.endDate;
  }
  if (props.body.reasonType !== undefined) {
    filterConditions.reason = props.body.reasonType;
  }
  // Determine pagination
  const cursor = props.body.page;
  const limit = props.body.limit;
  const effectiveLimit =
    limit === undefined || limit === null
      ? 20
      : Math.min(Math.max(limit, 0), 100) === 0
        ? 20
        : Math.min(Math.max(limit, 0), 100);
  // Build where condition for cursor pagination
  const cursorWhere: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    ...filterConditions,
  };
  if (cursor !== undefined && cursor !== null) {
    cursorWhere.timestamp = { lt: cursor };
  }
  // Fetch records with cursor pagination
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: cursorWhere,
      orderBy: { timestamp: "desc" as const },
      take: effectiveLimit,
      select: {
        id: true,
        variant_id: true,
        quantity_change: true,
        reason: true,
        timestamp: true,
      },
    });
  // Calculate current stock
  const stockResult =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: {
        variant_id: props.variantId,
        variant: {
          product: { seller_id: props.seller.id, deleted_at: null },
        },
      },
      _sum: { quantity_change: true },
    });
  const currentStockQuantity = stockResult._sum?.quantity_change ?? 0;
  // Get total count for current page
  const totalRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
      where: filterConditions,
    });
  // Calculate page number from cursor or default to 1
  const page =
    cursor !== undefined && cursor !== null ? parseInt(cursor, 10) + 1 : 1;
  return {
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: totalRecords,
      pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / effectiveLimit),
    } satisfies IPage.IPagination,
    data: records.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      variant_id: r.variant_id as string & tags.Format<"uuid">,
      quantity_change: r.quantity_change,
      reason: r.reason,
      timestamp: toISOStringSafe(r.timestamp) as string &
        tags.Format<"date-time">,
    })),
  };
}
