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

export async function patchEcommerceMallSellerVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const sortBy: "newest" | "oldest" | undefined = props.body.sortBy;
  const reasonFilter: string | undefined = props.body.reason;
  const dateRange:
    | {
        start?: string & tags.Format<"date-time">;
        end?: string & tags.Format<"date-time">;
      }
    | undefined = props.body.dateRange;
  if (page < 1 || !Number.isInteger(page)) {
    throw new HttpException("Invalid page number", 400);
  }
  if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
    throw new HttpException("Invalid limit", 400);
  }
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        product_id: true,
      },
    });
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: variant.product_id,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: {
    variant_id: string & tags.Format<"uuid">;
    reason?: string;
    timestamp?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    variant_id: props.variantId,
  };
  if (reasonFilter !== undefined) {
    whereInput.reason = reasonFilter;
  }
  if (dateRange !== undefined) {
    whereInput.timestamp = {};
    if (dateRange.start !== undefined) {
      whereInput.timestamp.gte = dateRange.start;
    }
    if (dateRange.end !== undefined) {
      whereInput.timestamp.lte = dateRange.end;
    }
  }
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput[] =
    sortBy === "oldest" ? [{ timestamp: "asc" }] : [{ timestamp: "desc" }];
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: (page - 1) * limit,
    take: limit,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  const allRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: [{ timestamp: "asc" }],
    });
  const runningTotalMap: Record<string, number> = {};
  let cumulativeSum: number = 0;
  for (const record of allRecords) {
    cumulativeSum += record.quantity_change;
    runningTotalMap[record.id] = cumulativeSum;
  }
  const dataWithStock: IEcommerceMallInventoryRecord.ISummary[] = data.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      variant_id: record.variant_id as string & tags.Format<"uuid">,
      quantity_change: record.quantity_change,
      reason: record.reason,
      timestamp: toISOStringSafe(record.timestamp) as string &
        tags.Format<"date-time">,
      current_stock: runningTotalMap[record.id],
    }),
  ) satisfies IEcommerceMallInventoryRecord.ISummary[];
  return {
    data: dataWithStock,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallInventoryRecord.ISummary;
}
