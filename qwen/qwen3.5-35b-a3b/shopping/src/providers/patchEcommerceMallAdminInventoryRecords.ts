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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminInventoryRecords(props: {
  admin: AdminPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    deleted_at: null,
    ...(props.body.variantId && {
      ecommerce_mall_product_variant_id: props.body.variantId,
    }),
    ...(props.body.reason && {
      reason: props.body.reason,
    }),
    ...(props.body.type && {
      type: props.body.type,
    }),
    ...(props.body.dateRange && {
      created_at: {
        gte: props.body.dateRange.from,
        lte: props.body.dateRange.to,
      },
    }),
    ...(props.body.quantityChangeRange && {
      quantity_change: {
        gte: props.body.quantityChangeRange.min,
        lte: props.body.quantityChangeRange.max,
      },
    }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  };
  // Build orderBy
  const direction: "asc" | "desc" =
    props.body.sortDirection === "ASC" ? "asc" : "desc";
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput[] =
    [
      {
        created_at: direction,
      },
    ];
  if (props.body.sortBy) {
    if (props.body.sortBy === "created_at") {
      orderByInput[0].created_at = direction;
    } else if (props.body.sortBy === "quantity_change") {
      orderByInput[0].quantity_change = direction;
    } else if (props.body.sortBy === "reason") {
      orderByInput[0].reason = direction;
    }
  }
  // Query data with transformer select
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  // Transform and return
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallInventoryRecordAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallInventoryRecord.ISummary;
}
