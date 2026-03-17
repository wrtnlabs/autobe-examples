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

export async function patchEcommerceMallSellerVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  // Verify variant exists and belongs to seller's product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
        product: {
          seller_id: props.seller.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found or access denied", 404);
  }
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    deleted_at: null,
    ecommerce_mall_product_variant_id: props.variantId,
    ...(props.body.recorded_at_from && {
      recorded_at: {
        gte: new Date(props.body.recorded_at_from),
      },
    }),
    ...(props.body.recorded_at_to && {
      recorded_at: {
        lte: new Date(props.body.recorded_at_to),
      },
    }),
    ...(props.body.reason && {
      reason: props.body.reason,
    }),
  };
  // Build orderBy
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput =
    props.body.sort_by === "quantity_change"
      ? { quantity_change: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "reason"
        ? { reason: props.body.sort_order ?? "desc" }
        : { recorded_at: props.body.sort_order ?? "desc" };
  // Fetch paginated records
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    });
  // Calculate total count
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await Promise.all(
      records.map((record) =>
        EcommerceMallInventoryRecordAtSummaryTransformer.transform(record),
      ),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
