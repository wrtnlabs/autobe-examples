import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventorySnapshotAtSummaryTransformer } from "../transformers/EcommerceMallInventorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerInventoryRecordsInventoryRecordIdSnapshots(props: {
  seller: SellerPayload;
  inventoryRecordId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventorySnapshot.IRequest;
}): Promise<IPageIEcommerceMallInventorySnapshot.ISummary> {
  // Verify inventory record exists and seller has authorization
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirst({
      where: {
        id: props.inventoryRecordId,
        deleted_at: null,
      },
      include: {
        variant: true,
      },
    });
  if (inventoryRecord === null) {
    throw new HttpException("Inventory record not found", 404);
  }
  // Verify seller authorization - check if inventory record's variant belongs to seller's product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: inventoryRecord.variant.product_id,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build filter conditions
  const whereConditions: Prisma.ecommerce_mall_inventory_snapshotsWhereInput = {
    inventory_record_id: props.inventoryRecordId,
    ...(props.body.created_at_after !== undefined && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.quantity_gte !== undefined && {
      quantity: { gte: props.body.quantity_gte },
    }),
    ...(props.body.quantity_lte !== undefined && {
      quantity: { lte: props.body.quantity_lte },
    }),
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: { contains: props.body.reason },
      }),
    ...(props.body.variant_id !== undefined && {
      variant_id: props.body.variant_id,
    }),
  };
  // Build sort options
  const orderByInput: Prisma.ecommerce_mall_inventory_snapshotsOrderByWithRelationInput[] =
    [
      props.body.sort_by === "quantity"
        ? { quantity: props.body.sort_order === "asc" ? "asc" : "desc" }
        : { created_at: props.body.sort_order === "asc" ? "asc" : "desc" },
    ];
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_inventory_snapshots.findMany({
      where: whereConditions,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallInventorySnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_snapshots.count({
    where: whereConditions,
  });
  // Transform and return
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallInventorySnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallInventorySnapshot.ISummary;
}
