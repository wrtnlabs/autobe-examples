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
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      product: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ? parseInt(props.body.page, 10) : 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * pageSize;
  const whereInput = {
    variant_id: props.variantId,
    ...(props.body.startDate !== undefined && {
      timestamp: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate !== undefined && {
      timestamp: { lte: new Date(props.body.endDate) },
    }),
    ...(props.body.reasonType !== undefined && {
      reason: props.body.reasonType,
    }),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const orderByInput = [
    {
      timestamp: props.body.sortOrder === "asc" ? "asc" : "desc",
    },
  ] satisfies Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: pageSize,
    select: {
      id: true,
      variant_id: true,
      quantity_change: true,
      reason: true,
      timestamp: true,
    } satisfies Prisma.ecommerce_mall_inventory_recordsSelect,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  const currentStockResult =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: {
        variant_id: props.variantId,
      },
      _sum: {
        quantity_change: true,
      },
    });
  const currentStock = currentStockResult._sum.quantity_change ?? 0;
  const transformedData = data.map(
    (record) =>
      ({
        id: record.id,
        variant_id: record.variant_id,
        quantity_change: record.quantity_change,
        reason: record.reason,
        timestamp: toISOStringSafe(record.timestamp),
      }) satisfies IEcommerceMallInventoryRecord.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallInventoryRecord.ISummary;
}
