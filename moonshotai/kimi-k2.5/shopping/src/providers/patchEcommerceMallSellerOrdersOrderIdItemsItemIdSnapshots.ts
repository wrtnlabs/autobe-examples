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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrdersOrderIdItemsItemIdSnapshots(props: {
  seller: SellerPayload;
  orderId: string;
  itemId: string;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot> {
  // Verify order item exists and belongs to seller
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      order_id: props.orderId,
      seller_id: props.seller.id,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  // Build where clause for snapshot filtering
  const whereInput: {
    order_item_id: string;
    created_at?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    order_item_id: props.itemId,
  };
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    whereInput.created_at = {
      ...whereInput.created_at,
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    whereInput.created_at = {
      ...whereInput.created_at,
      lte: new Date(props.body.createdAtTo),
    };
  }
  const where =
    whereInput satisfies Prisma.ecommerce_mall_order_item_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderItemSnapshotTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where,
    },
  );
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallOrderItemSnapshotTransformer.transform,
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
