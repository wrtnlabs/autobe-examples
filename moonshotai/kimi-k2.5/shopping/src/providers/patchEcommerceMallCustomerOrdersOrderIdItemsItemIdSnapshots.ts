import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot> {
  // Step 1: Verify order exists and belongs to authenticated customer
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Verify order item exists in this order
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      order_id: props.orderId,
    },
    select: { id: true },
  });
  // Step 3: Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Build the where clause with date range filters
  const dateFilters: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAtFrom !== null &&
    props.body.createdAtFrom !== undefined
  ) {
    dateFilters.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== null && props.body.createdAtTo !== undefined) {
    dateFilters.lte = new Date(props.body.createdAtTo);
  }
  const where: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    order_item_id: props.itemId,
    ...(Object.keys(dateFilters).length > 0 && { created_at: dateFilters }),
  };
  // Step 5: Query snapshots with pagination using transformer select
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderItemSnapshotTransformer.select(),
    });
  // Step 6: Count total for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    { where },
  );
  // Step 7: Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallOrderItemSnapshotTransformer.transform,
  );
  // Step 8: Return paginated response
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
