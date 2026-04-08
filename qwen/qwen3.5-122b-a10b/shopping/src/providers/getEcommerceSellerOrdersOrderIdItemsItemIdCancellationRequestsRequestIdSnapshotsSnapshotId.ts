import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestSnapshotTransformer } from "../transformers/EcommerceCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerOrdersOrderIdItemsItemIdCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestSnapshot> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_order_id: true,
        ecommerce_seller_id: true,
      },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  if (orderItem.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_order_item_id: true,
      },
    });
  if (cancellationRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order item",
      404,
    );
  }
  const record =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceCancellationRequestSnapshotTransformer.select(),
      },
    );
  if (record.cancellationRequest.id !== props.requestId) {
    throw new HttpException(
      "Snapshot does not belong to the specified cancellation request",
      404,
    );
  }
  return await EcommerceCancellationRequestSnapshotTransformer.transform(
    record,
  );
}
