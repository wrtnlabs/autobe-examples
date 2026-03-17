import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
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
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdProductSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  // Verify order exists and belongs to this customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found or access denied", 403);
  }
  // Verify order item exists and belongs to this order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.itemId },
      select: { id: true, order_id: true },
    },
  );
  if (orderItem === null || orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item not found", 404);
  }
  // Retrieve the product snapshot with order_item_id included
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findUnique(
      {
        where: { id: props.snapshotId },
        select: {
          ...EcommerceMallOrderItemProductSnapshotTransformer.select().select,
          order_item_id: true,
        },
      },
    );
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Verify snapshot belongs to this order item
  if (snapshot.order_item_id !== props.itemId) {
    throw new HttpException(
      "Snapshot not associated with this order item",
      404,
    );
  }
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    snapshot,
  );
}
