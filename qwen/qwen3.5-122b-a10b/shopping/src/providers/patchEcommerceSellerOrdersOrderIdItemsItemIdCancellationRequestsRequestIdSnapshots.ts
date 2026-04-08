import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdItemsItemIdCancellationRequestsRequestIdSnapshots(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceCancellationRequestSnapshot.ISummary> {
  // Validate order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Validate order item belongs to the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to order", 404);
  }
  // Validate cancellation request belongs to the order item
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true, ecommerce_order_item_id: true },
    });
  if (cancellationRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException(
      "Cancellation request does not belong to order item",
      404,
    );
  }
  // Build where clause with filters
  const whereInput = {
    ecommerce_cancellation_request_id: props.requestId,
    ...(props.body.status_before !== undefined && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after !== undefined && {
      status_after: props.body.status_after,
    }),
    ...(props.body.changed_by_actor_type !== undefined && {
      changed_by_actor_type: props.body.changed_by_actor_type,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.ecommerce_cancellation_request_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Query snapshots
  const records =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCancellationRequestSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
  };
}
