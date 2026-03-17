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
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallVariantsVariantIdInventory(props: {
  variantId: string;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  // Verify variant exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Build date range filter conditionally
  const createdAtFilter: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.startDate !== undefined && props.body.startDate !== null) {
    createdAtFilter.gte = props.body.startDate;
  }
  if (props.body.endDate !== undefined && props.body.endDate !== null) {
    createdAtFilter.lte = props.body.endDate;
  }
  // Construct where clause
  const where: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    product_variant_id: props.variantId,
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: props.body.reason,
      }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query records and count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_inventory_records.count({ where }),
  ]);
  // Transform records to DTOs
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallInventoryRecordAtSummaryTransformer.transform,
  );
  // Build response
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
