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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerInventoryRecordsInventoryRecordIdSnapshots(props: {
  seller: SellerPayload;
  inventoryRecordId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventorySnapshot.IRequest;
}): Promise<IPageIEcommerceMallInventorySnapshot.ISummary> {
  // Verify inventory record exists and belongs to seller
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: { id: true, ecommerce_mall_product_variant_id: true },
    });
  // Verify seller owns the product variant
  const productVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: inventoryRecord.ecommerce_mall_product_variant_id },
      select: { id: true, product_id: true },
    });
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: productVariant.product_id },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build dynamic WHERE clause
  const whereInput = {
    inventory_record_id: props.inventoryRecordId,
    ...(props.body.created_at_after && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.created_at_before && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.quantity_gte !== undefined && {
      quantity: { gte: props.body.quantity_gte },
    }),
    ...(props.body.quantity_lte !== undefined && {
      quantity: { lte: props.body.quantity_lte },
    }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason },
    }),
    ...(props.body.variant_id && {
      variant_id: props.body.variant_id,
    }),
  } satisfies Prisma.ecommerce_mall_inventory_snapshotsWhereInput;
  // Build ORDER BY with type safety
  const orderByInput =
    props.body.sort_by === "quantity"
      ? {
          quantity: (props.body.sort_order ?? "asc") satisfies Prisma.SortOrder,
        }
      : {
          created_at: (props.body.sort_order ??
            "desc") satisfies Prisma.SortOrder,
        };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_inventory_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_snapshots.count({
    where: whereInput,
  });
  // Transform to ISummary format
  const transformedData = snapshots.map(
    (snapshot) =>
      ({
        id: snapshot.id as string & tags.Format<"uuid">,
        inventoryRecord: {
          id: snapshot.inventory_record_id as string & tags.Format<"uuid">,
          variant_id: snapshot.variant_id as string & tags.Format<"uuid">,
          quantity_change: Number(snapshot.quantity) as number &
            tags.Type<"int32">,
          remaining_quantity: Number(snapshot.reserved_quantity) as number &
            tags.Type<"int32">,
          reason: snapshot.reason ?? "",
          type: "adjustment" as string,
          description: snapshot.notes ?? "",
          created_at: toISOStringSafe(snapshot.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(snapshot.created_at) as string &
            tags.Format<"date-time">,
          deleted_at: null,
          ecommerce_mall_order_id: null,
          ecommerce_mall_cancellation_request_id: null,
          ecommerce_mall_refund_request_id: null,
        } satisfies IEcommerceMallInventoryRecord.ISummary,
        variantId: snapshot.variant_id as string & tags.Format<"uuid">,
        quantity: Number(snapshot.quantity) as number & tags.Type<"int32">,
        reservedQuantity: Number(snapshot.reserved_quantity) as number &
          tags.Type<"int32">,
        reason: snapshot.reason ?? null,
        notes: snapshot.notes ?? null,
        createdAt: toISOStringSafe(snapshot.created_at) as string &
          tags.Format<"date-time">,
      }) satisfies IEcommerceMallInventorySnapshot.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
