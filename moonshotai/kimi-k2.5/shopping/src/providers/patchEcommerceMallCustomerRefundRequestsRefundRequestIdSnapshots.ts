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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Verify refund request exists and belongs to this customer
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        customer_id: props.customer.id,
      },
      select: { id: true },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filters
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          reason: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          response_reason: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput =
    {};
  if (props.body.sortField === "status") {
    orderByInput.status = props.body.sortDirection ?? "desc";
  } else {
    orderByInput.created_at = props.body.sortDirection ?? "desc";
  }
  // Fetch snapshots
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
