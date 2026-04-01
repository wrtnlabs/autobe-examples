import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestSnapshotTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemsOrderItemIdRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallRefundRequestSnapshotTransformer.select(),
      },
    );
  if (snapshot.refundRequest.id !== props.refundRequestId) {
    throw new HttpException(
      "Snapshot does not belong to the specified refund request",
      404,
    );
  }
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
      },
    });
  if (refundRequest.order_item_id !== props.orderItemId) {
    throw new HttpException(
      "Refund request does not belong to the specified order item",
      404,
    );
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (
    refundRequest.customer_id !== props.customer.id &&
    orderItem.shopping_mall_seller_id !== props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallRefundRequestSnapshotTransformer.transform(snapshot);
}
