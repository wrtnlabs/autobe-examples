import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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

export async function patchEcommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Verify refund request exists and belongs to seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        seller_id: props.seller.id,
      },
      select: { id: true },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found or access denied", 404);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Sort configuration
  const sortField = props.body.sortField ?? "createdAt";
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderByColumn = sortField === "status" ? "status" : "created_at";
  const orderDirection = sortDirection === "asc" ? "asc" : "desc";
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
  };
  // Add status filter if provided
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Add search filter if provided
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.OR = [
      { reason: { contains: props.body.search, mode: "insensitive" } },
      { response_reason: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [orderByColumn]: orderDirection },
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data: transformedData,
    pagination,
  };
}
