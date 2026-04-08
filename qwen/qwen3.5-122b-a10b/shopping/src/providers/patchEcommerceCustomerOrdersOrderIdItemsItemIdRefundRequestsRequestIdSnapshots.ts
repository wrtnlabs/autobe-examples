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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdItemsItemIdRefundRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceRefundRequestSnapshot.ISummary> {
  // Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate order item belongs to order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item not found", 404);
  }
  // Validate refund request belongs to order item
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true, ecommerce_order_item_id: true },
    });
  if (refundRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException("Refund request not found", 404);
  }
  // Validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_refund_request_snapshotsWhereInput = {
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
  // Query snapshots
  const records =
    await MyGlobal.prisma.ecommerce_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...EcommerceRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_refund_request_snapshots.count({
    where: whereInput,
  });
  // Transform results
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
    },
    data: data,
  } satisfies IPageIEcommerceRefundRequestSnapshot.ISummary;
}
