import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCancellationRequestSnapshotTransformer } from "../transformers/EcommerceCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdItemsItemIdCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestSnapshot> {
  // Verify order exists (admin has full access to all orders)
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Verify order item belongs to the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  // Verify cancellation request belongs to the order item
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { ecommerce_order_item_id: true },
    });
  if (cancellationRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order item",
      404,
    );
  }
  // Verify snapshot exists and belongs to the cancellation request
  const record =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_cancellation_request_id: props.requestId,
        },
        ...EcommerceCancellationRequestSnapshotTransformer.select(),
      },
    );
  return await EcommerceCancellationRequestSnapshotTransformer.transform(
    record,
  );
}
