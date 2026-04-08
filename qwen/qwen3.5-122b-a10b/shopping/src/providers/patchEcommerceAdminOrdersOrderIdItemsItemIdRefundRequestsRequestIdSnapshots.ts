import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdItemsItemIdRefundRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceRefundRequestSnapshot.ISummary> {
  // Validate order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Validate order item exists and belongs to order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to order", 404);
  }
  // Validate refund request exists and belongs to order item
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { ecommerce_order_item_id: true },
    });
  if (refundRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException(
      "Refund request does not belong to order item",
      404,
    );
  }
  // Build where clause for snapshots
  const where: Prisma.ecommerce_refund_request_snapshotsWhereInput = {
    ecommerce_refund_request_id: props.requestId,
    ...(props.body.status !== undefined && { status: props.body.status }),
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
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch snapshots
  const records =
    await MyGlobal.prisma.ecommerce_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...EcommerceRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_refund_request_snapshots.count({
    where,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceRefundRequestSnapshot.ISummary;
}
