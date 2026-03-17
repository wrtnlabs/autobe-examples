import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function patchShoppingMallAdminProductsProductIdSnapshotsSnapshotIdVariantSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  // Validate product snapshot exists and belongs to specified productId
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
    });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const snapshotAtConditions: Prisma.DateTimeFilter = {};
  if (props.body.snapshot_at_from) {
    snapshotAtConditions.gte = new Date(props.body.snapshot_at_from);
  }
  if (props.body.snapshot_at_to) {
    snapshotAtConditions.lte = new Date(props.body.snapshot_at_to);
  }
  const whereInput: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {
    product_snapshot_id: props.snapshotId,
    ...(Object.keys(snapshotAtConditions).length > 0 && {
      snapshot_at: snapshotAtConditions,
    }),
    ...(props.body.sku_code && {
      sku_code: { contains: props.body.sku_code },
    }),
    ...(props.body.option_values && {
      option_values: { contains: props.body.option_values },
    }),
  } satisfies Prisma.shopping_mall_product_variant_snapshotsWhereInput;
  // Parse sort parameter
  const sortParam = props.body.sort ?? "snapshot_at,desc";
  const [sortFieldRaw, sortDirRaw] = sortParam.split(",");
  const sortField = sortFieldRaw ?? "snapshot_at";
  const sortDir: "asc" | "desc" = (sortDirRaw as "asc" | "desc") ?? "desc";
  const orderByInput = {
    [sortField]: sortDir,
  } satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput;
  // Query variant snapshots
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        snapshot_at: true,
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = data.map(
    (record) =>
      ({
        id: record.id as string & tags.Format<"uuid">,
        sku_code: record.sku_code,
        option_values: JSON.parse(record.option_values) as {
          [key: string]: string;
        },
        price: record.price === null ? null : record.price,
        stock_quantity: record.stock_quantity as number & tags.Type<"int32">,
        snapshot_at: record.snapshot_at.toISOString() as string &
          tags.Format<"date-time">,
      }) satisfies IShoppingMallProductVariantSnapshot.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductVariantSnapshot.ISummary;
}
