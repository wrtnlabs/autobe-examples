import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceRefundRequestSnapshotTransformer } from "../transformers/EcommerceRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdItemsItemIdRefundRequestsRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundRequestSnapshot> {
  // Validate relationship chain: order -> order item -> refund request -> snapshot
  // 1. Verify order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Verify order item exists and belongs to the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item not found", 404);
  }
  // 3. Verify refund request exists and belongs to the order item
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true, ecommerce_order_item_id: true },
    });
  if (refundRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException("Refund request not found", 404);
  }
  // 4. Verify snapshot exists and belongs to the refund request
  const snapshot =
    await MyGlobal.prisma.ecommerce_refund_request_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_refund_request_id: props.requestId,
      },
      ...EcommerceRefundRequestSnapshotTransformer.select(),
    });
  // Admin can view any snapshot (authorization already validated via AdminAuth decorator)
  return await EcommerceRefundRequestSnapshotTransformer.transform(snapshot);
}
