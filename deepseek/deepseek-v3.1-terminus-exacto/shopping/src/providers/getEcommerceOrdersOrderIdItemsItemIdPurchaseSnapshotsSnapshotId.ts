import { IEcommerceOrderItemPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemPurchaseSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceOrderItemPurchaseSnapshotTransformer } from "../transformers/EcommerceOrderItemPurchaseSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceOrdersOrderIdItemsItemIdPurchaseSnapshotsSnapshotId(props: {
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemPurchaseSnapshot> {
  // Verify the order item exists and belongs to the specified order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.itemId },
    select: { id: true, order_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  // Retrieve the specific purchase snapshot with validation that it belongs to the order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_item_purchase_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_order_item_id: props.itemId,
        },
        ...EcommerceOrderItemPurchaseSnapshotTransformer.select(),
      },
    );
  return await EcommerceOrderItemPurchaseSnapshotTransformer.transform(
    snapshot,
  );
}
