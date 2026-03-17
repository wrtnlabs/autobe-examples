import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrdersOrderIdItemsItemIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string;
  itemId: string;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  // Validate order item exists and belongs to the specified order
  await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      order_id: props.orderId,
    },
  });
  // Build where clause
  const where: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    order_item_id: props.itemId,
  };
  // Apply created_at range filters
  if (props.body.createdAtFrom || props.body.createdAtTo) {
    where.created_at = {};
    if (props.body.createdAtFrom) {
      where.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo) {
      where.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots with filters - admins have full access
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...EcommerceMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where,
    },
  );
  // Transform records
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallOrderItemSnapshotAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
