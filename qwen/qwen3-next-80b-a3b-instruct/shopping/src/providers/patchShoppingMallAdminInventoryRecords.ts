import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";

export async function patchShoppingMallAdminInventoryRecords(props: {
  admin: AdminPayload;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  // Extract pagination parameters with defaults
  const pageSize = props.body.pageSize ?? 10;
  const cursor = props.body.cursor;
  // Build where condition dynamically
  const whereInput: any = {
    deleted_at: null,
  };
  // Apply filters
  if (props.body.variantId) {
    whereInput.variant_id = props.body.variantId;
  }
  if (props.body.sourceType) {
    whereInput.source_type = props.body.sourceType;
  }
  if (props.body.reason) {
    whereInput.reason = { contains: props.body.reason };
  }
  // Filter by date ranges
  if (props.body.startDate || props.body.endDate) {
    whereInput.created_at = {};
    if (props.body.startDate) {
      whereInput.created_at.gte = props.body.startDate;
    }
    if (props.body.endDate) {
      whereInput.created_at.lte = props.body.endDate;
    }
  }
  // Build order by condition
  let orderByInput: any;
  switch (props.body.sortBy) {
    case "quantity_change":
      orderByInput = { quantity_change: "asc" as const };
      break;
    case "source_type":
      orderByInput = { source_type: "asc" as const };
      break;
    case "created_at":
    default:
      orderByInput = { created_at: "asc" as const };
  }
  // For cursor-based pagination, we need to fetch one more record than the limit to determine if there's a next page
  const limitWithOneExtra = pageSize + 1;
  // Fetch data with transformer's select
  let data: any[];
  if (cursor) {
    // Cursor-based pagination with after cursor
    data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limitWithOneExtra,
      skip: 0,
      cursor: {
        id: cursor,
      },
      ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    });
  } else {
    // First page (no cursor)
    data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limitWithOneExtra,
      skip: 0,
      ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    });
  }
  // Extract actual data (trim the extra record)
  const hasMore = data.length > pageSize;
  if (hasMore) {
    data = data.slice(0, -1);
  }
  // Fetch total count if we're on the first page with no cursor
  const total = cursor
    ? undefined
    : await MyGlobal.prisma.shopping_mall_inventory_records.count({
        where: whereInput,
      });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallInventoryRecordAtSummaryTransformer.transform,
  );
  // Return paginated result
  return {
    data: transformedData,
    pagination: {
      current: cursor ? 2 : 1,
      limit: pageSize,
      records: total ?? 0,
      pages: total ? Math.ceil(total / pageSize) : 0,
    } satisfies IPage.IPagination,
  };
}
