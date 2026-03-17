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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemVariantSnapshotTransformer } from "../transformers/EcommerceMallOrderItemVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsItemIdVariantSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string;
  itemId: string;
  snapshotId: string;
}): Promise<IEcommerceMallOrderItemVariantSnapshot> {
  // Verify order item exists and belongs to the specified order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, order_id: true },
    });
  // Validate that the order item belongs to the specified order
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  // Retrieve the variant snapshot with attributes using the transformer
  const transformerQuery =
    EcommerceMallOrderItemVariantSnapshotTransformer.select();
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...transformerQuery,
        select: {
          ...transformerQuery.select,
          order_item_id: true,
        },
      },
    );
  // Validate that the snapshot belongs to the specified order item
  if (snapshot.order_item_id !== props.itemId) {
    throw new HttpException("Snapshot not found for specified order item", 404);
  }
  // Transform and return the result
  return await EcommerceMallOrderItemVariantSnapshotTransformer.transform(
    snapshot,
  );
}
