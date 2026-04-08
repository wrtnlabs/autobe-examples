import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestSnapshotTransformer } from "../transformers/EcommerceRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemIdRefundRequestsRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundRequestSnapshot> {
  // Verify the order belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the order item exists and belongs to the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the refund request exists and belongs to the order item
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true, ecommerce_order_item_id: true },
    });
  if (refundRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the snapshot exists and belongs to the refund request
  const snapshot =
    await MyGlobal.prisma.ecommerce_refund_request_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceRefundRequestSnapshotTransformer.select(),
    });
  if (snapshot.refundRequest.id !== props.requestId) {
    throw new HttpException("Not Found", 404);
  }
  return await EcommerceRefundRequestSnapshotTransformer.transform(snapshot);
}
