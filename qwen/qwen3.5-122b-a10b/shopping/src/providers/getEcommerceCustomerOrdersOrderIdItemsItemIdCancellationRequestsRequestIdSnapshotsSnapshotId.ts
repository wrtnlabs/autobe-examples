import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestSnapshotTransformer } from "../transformers/EcommerceCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemIdCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestSnapshot> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Not Found", 404);
  }
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true, ecommerce_order_item_id: true },
    });
  if (cancellationRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException("Not Found", 404);
  }
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
