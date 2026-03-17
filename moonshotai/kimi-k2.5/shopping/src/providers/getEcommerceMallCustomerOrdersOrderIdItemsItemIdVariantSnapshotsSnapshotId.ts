import { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemVariantSnapshotTransformer } from "../transformers/EcommerceMallOrderItemVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdVariantSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemVariantSnapshot> {
  // Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Verify order item exists and belongs to order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      order_id: props.orderId,
    },
    select: { id: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify snapshot exists and belongs to order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_variant_snapshots.findFirst(
      {
        where: {
          id: props.snapshotId,
          order_item_id: props.itemId,
        },
        ...EcommerceMallOrderItemVariantSnapshotTransformer.select(),
      },
    );
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  return EcommerceMallOrderItemVariantSnapshotTransformer.transform(snapshot);
}
