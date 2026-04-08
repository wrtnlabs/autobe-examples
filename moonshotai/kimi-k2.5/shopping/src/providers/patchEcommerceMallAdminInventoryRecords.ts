import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortDirection = props.body.sortDirection === "asc" ? "asc" : "desc";
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.dateRangeFrom) {
    createdAtFilter.gte = new Date(props.body.dateRangeFrom);
  }
  if (props.body.dateRangeTo) {
    createdAtFilter.lte = new Date(props.body.dateRangeTo);
  }
  const where = {
    ...(props.body.variantId && { product_variant_id: props.body.variantId }),
    ...(props.body.reason && { reason: props.body.reason }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.quantityDirection === "positive" && {
      quantity_change: { gt: 0 },
    }),
    ...(props.body.quantityDirection === "negative" && {
      quantity_change: { lt: 0 },
    }),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const whereWithProductId = props.body.productId
    ? ({
        ...where,
        variant: {
          product: {
            id: props.body.productId,
          },
        },
      } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput)
    : where;
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereWithProductId,
    skip,
    take: limit,
    orderBy: { created_at: sortDirection },
    ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereWithProductId,
  });
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
