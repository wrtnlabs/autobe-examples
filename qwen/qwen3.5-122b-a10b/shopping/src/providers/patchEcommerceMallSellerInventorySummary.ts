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

export async function patchEcommerceMallSellerInventorySummary(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    AND: [
      {
        productVariant: {
          ecommerce_mall_product_id: {
            in: (
              await MyGlobal.prisma.ecommerce_mall_products.findMany({
                where: { seller_id: props.seller.id },
                select: { id: true },
              })
            ).map((p) => p.id),
          },
        },
      },
      ...(props.body.variant_id
        ? [
            {
              productVariant: {
                id: props.body.variant_id,
              },
            },
          ]
        : []),
      ...(props.body.product_id
        ? [
            {
              productVariant: {
                ecommerce_mall_product_id: props.body.product_id,
              },
            },
          ]
        : []),
      ...(props.body.recorded_at_from
        ? [
            {
              recorded_at: {
                gte: new Date(props.body.recorded_at_from),
              },
            },
          ]
        : []),
      ...(props.body.recorded_at_to
        ? [
            {
              recorded_at: {
                lte: new Date(props.body.recorded_at_to),
              },
            },
          ]
        : []),
      ...(props.body.reason ? [{ reason: props.body.reason }] : []),
    ],
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput =
    props.body.sort_by === "quantity_change"
      ? { quantity_change: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "reason"
        ? { reason: props.body.sort_order ?? "desc" }
        : { recorded_at: props.body.sort_order ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_inventory_records.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallInventoryRecordAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallInventoryRecord.ISummary;
}
