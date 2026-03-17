import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdSellerSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
  snapshotId: string;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  // Verify order belongs to customer
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Verify order item belongs to order
  await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      order_id: props.orderId,
    },
    select: { id: true },
  });
  // Find the snapshot and verify it belongs to the specified order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          order_item_id: props.itemId,
        },
        ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
    snapshot,
  );
}
