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

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  // Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found or access denied", 404);
  }
  // Verify order item exists and belongs to the order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
    },
    select: { id: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Find the seller snapshot
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        where: {
          order_item_id: props.orderItemId,
        },
        ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
    snapshot,
  );
}
