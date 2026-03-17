import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSellerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrdersOrderIdItemsItemIdSellerSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemSellerSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSellerSnapshot> {
  // Verify order item exists and belongs to the specified order
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      order_id: props.orderId,
    },
    select: { id: true },
  });
  // Build where clause for snapshots
  const whereInput: Prisma.ecommerce_mall_order_item_seller_snapshotsWhereInput =
    {
      order_item_id: props.itemId,
    };
  // Apply date range filters if provided
  if (props.body.fromDate !== undefined || props.body.toDate !== undefined) {
    whereInput.created_at = {};
    if (props.body.fromDate !== undefined) {
      whereInput.created_at.gte = new Date(props.body.fromDate);
    }
    if (props.body.toDate !== undefined) {
      whereInput.created_at.lte = new Date(props.body.toDate);
    }
  }
  // Parse pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Parse sort order
  const orderByInput: Prisma.ecommerce_mall_order_item_seller_snapshotsOrderByWithRelationInput =
    props.body.sort === "createdAt_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.count({
      where: whereInput,
    });
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallOrderItemSellerSnapshotTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
