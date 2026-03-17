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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequestsRefundRequestIdSnapshots(props: {
  admin: AdminPayload;
  refundRequestId: string;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Verify the refund request exists
  await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
    where: { id: props.refundRequestId },
    select: { id: true },
  });
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const sortField = props.body.sortField ?? "createdAt";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Build where clause
  const whereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined && {
      OR: [
        { reason: { contains: props.body.search } },
        { response_reason: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  // Build orderBy based on sortField and sortDirection
  const orderByInput = (
    sortField === "status"
      ? { status: sortDirection }
      : { created_at: sortDirection }
  ) satisfies Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput;
  // Get total count first
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Query paginated data
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
