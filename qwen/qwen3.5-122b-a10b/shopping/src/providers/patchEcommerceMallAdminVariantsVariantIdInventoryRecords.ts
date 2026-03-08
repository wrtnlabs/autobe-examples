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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminVariantsVariantIdInventoryRecords(props: {
  admin: AdminPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  // Verify variant exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      deleted_at: null,
    },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    ecommerce_mall_product_variant_id: props.variantId,
    deleted_at: null,
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
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  // Build orderBy clause
  const sort_by = props.body.sort_by ?? "recorded_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput =
    sort_by === "reason" ? { reason: sort_order } : { recorded_at: sort_order };
  // Fetch paginated records with nested selects
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        recorded_at: true,
        current_stock: true,
        productVariant: {
          select: {
            sku_code: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  // Transform to ISummary format
  const data = records.map(
    (record) =>
      ({
        id: v4() as string & tags.Format<"uuid">,
        quantity_change: record.quantity_change as number & tags.Type<"int32">,
        reason: record.reason,
        recorded_at: toISOStringSafe(record.recorded_at),
        current_stock: record.current_stock as number & tags.Type<"int32">,
        variant_sku_code: record.productVariant.sku_code,
        product_name: record.productVariant.product.name,
      }) satisfies IEcommerceMallInventoryRecord.ISummary,
  );
  // Return paginated response
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallInventoryRecord.ISummary;
}
