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
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    deleted_at: null,
    variant: {
      product: {
        seller_id: props.seller.id,
      },
    },
    ...(props.body.variantId !== undefined
      ? { ecommerce_mall_product_variant_id: props.body.variantId }
      : {}),
    ...(props.body.reason !== undefined ? { reason: props.body.reason } : {}),
    ...(props.body.type !== undefined ? { type: props.body.type } : {}),
    ...(props.body.dateRange !== undefined
      ? {
          created_at: {
            gte: props.body.dateRange.from,
            lte: props.body.dateRange.to,
          },
        }
      : {}),
    ...(props.body.quantityChangeRange !== undefined
      ? {
          quantity_change: {
            gte: props.body.quantityChangeRange.min,
            lte: props.body.quantityChangeRange.max,
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? { reason: { contains: props.body.search, mode: "insensitive" } }
      : {}),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput[] =
    props.body.sortBy === "created_at"
      ? [
          {
            created_at: props.body.sortDirection === "ASC" ? "asc" : "desc",
          },
        ]
      : props.body.sortBy === "quantity_change"
        ? [
            {
              quantity_change:
                props.body.sortDirection === "ASC" ? "asc" : "desc",
            },
          ]
        : props.body.sortBy === "reason"
          ? [
              {
                reason: props.body.sortDirection === "ASC" ? "asc" : "desc",
              },
            ]
          : [{ created_at: "desc" }];
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
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
