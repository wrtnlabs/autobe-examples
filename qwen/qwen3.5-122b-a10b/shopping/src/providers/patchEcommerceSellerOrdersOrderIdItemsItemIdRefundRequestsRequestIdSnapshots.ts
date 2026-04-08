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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdItemsItemIdRefundRequestsRequestIdSnapshots(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceRefundRequestSnapshot.ISummary> {
  // Validate path parameters exist and belong to each other
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { ecommerce_order_id: true, ecommerce_product_variant_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to order", 404);
  }
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
  // Verify seller authorization (owns the product in the order item)
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: orderItem.ecommerce_product_variant_id },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause for snapshots
  const whereInput = {
    ecommerce_refund_request_id: props.requestId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_refund_request_snapshotsWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute paginated query
  const records =
    await MyGlobal.prisma.ecommerce_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
      ...EcommerceRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_refund_request_snapshots.count({
    where: whereInput,
  });
  // Transform records to DTO
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  // Calculate pages
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  } satisfies IPageIEcommerceRefundRequestSnapshot.ISummary;
}
