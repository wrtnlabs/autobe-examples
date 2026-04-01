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
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    deleted_at: null,
  };
  if (props.body.variantId !== undefined) {
    whereInput.ecommerce_mall_product_variant_id = props.body.variantId;
  }
  if (props.body.reason !== undefined) {
    whereInput.reason = props.body.reason;
  }
  if (props.body.type !== undefined) {
    whereInput.type = props.body.type;
  }
  if (props.body.dateRange !== undefined) {
    whereInput.created_at = {
      gte: props.body.dateRange.from,
      lte: props.body.dateRange.to,
    } as Prisma.DateTimeFilter;
  }
  if (props.body.quantityChangeRange !== undefined) {
    whereInput.quantity_change = {
      gte: props.body.quantityChangeRange.min,
      lte: props.body.quantityChangeRange.max,
    } as Prisma.IntFilter;
  }
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    whereInput.OR = [
      { reason: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput[] =
    props.body.sortBy !== undefined
      ? [
          {
            [props.body.sortBy]:
              props.body.sortDirection === "DESC" ? "desc" : "asc",
          },
        ]
      : [{ created_at: "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_inventory_records.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallInventoryRecordAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
