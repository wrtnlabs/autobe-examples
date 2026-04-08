import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderItemsOrderItemIdRefundRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  // Verify order item exists and belongs to this seller
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { seller_id: true },
    });
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException(
      "You can only view refund requests for your own order items",
      403,
    );
  }
  // Build filter conditions
  const whereInput = {
    order_item_id: props.orderItemId,
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.requestedAtFrom !== undefined && {
      requested_at: { gte: new Date(props.body.requestedAtFrom) },
    }),
    ...(props.body.requestedAtTo !== undefined && {
      requested_at: { lte: new Date(props.body.requestedAtTo) },
    }),
  } satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query refund requests
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { requested_at: "desc" },
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  // Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
