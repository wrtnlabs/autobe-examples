import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsRequestIdSnapshots(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Verify refund request exists and belongs to this seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Authorization: Seller can only view snapshots for their own refund requests
  if (refundRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput = {
    ecommerce_mall_refund_request_id: props.requestId,
    ...(props.body.snapshot_status && {
      snapshot_status: props.body.snapshot_status,
    }),
    ...(props.body.seller_response && {
      seller_response: props.body.seller_response,
    }),
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
  };
  // Build orderBy based on sortField and sortOrder
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  };
  // Query snapshots with transformer select
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
