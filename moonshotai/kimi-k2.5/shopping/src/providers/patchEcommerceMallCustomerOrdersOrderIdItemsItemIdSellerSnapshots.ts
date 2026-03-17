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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItemsItemIdSellerSnapshots(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
  body: IEcommerceMallOrderItemSellerSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSellerSnapshot> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Verify order item exists and customer owns the order
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      order_id: props.orderId,
      order: {
        customer_id: props.customer.id,
      },
    },
    select: { id: true },
  });
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_mall_order_item_seller_snapshotsWhereInput =
    {
      order_item_id: props.itemId,
      ...(props.body.fromDate && {
        created_at: { gte: new Date(props.body.fromDate) },
      }),
      ...(props.body.toDate && {
        created_at: { lte: new Date(props.body.toDate) },
      }),
    };
  // Determine sort order
  const orderByInput: Prisma.ecommerce_mall_order_item_seller_snapshotsOrderByWithRelationInput =
    props.body.sort === "createdAt_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.count({
      where: whereInput,
    });
  // Transform snapshots to DTOs
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallOrderItemSellerSnapshotTransformer.transform,
  );
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
