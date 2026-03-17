import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemSnapshot> {
  // Combined query to fetch snapshot and verify full ownership hierarchy
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallOrderItemSnapshotTransformer.select(),
      },
    );
  // Verify the snapshot belongs to the specified order item
  if (snapshot.order_item_id !== props.itemId) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Verify the order item belongs to the specified order and customer
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        order_id: true,
        order: { select: { customer_id: true } },
      },
    });
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the snapshot
  return await EcommerceMallOrderItemSnapshotTransformer.transform(snapshot);
}
