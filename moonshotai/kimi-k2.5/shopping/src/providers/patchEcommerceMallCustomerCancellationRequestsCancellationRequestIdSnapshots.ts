import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  cancellationRequestId: string;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  // Verify customer owns this cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        id: props.cancellationRequestId,
        customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Build where clause with filters
  const whereInput = {
    cancellation_request_id: props.cancellationRequestId,
    ...(props.body.statusBefore !== null && {
      status_before: props.body.statusBefore,
    }),
    ...(props.body.statusAfter !== null && {
      status_after: props.body.statusAfter,
    }),
    ...(props.body.createdAtFrom !== null && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== null && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // Pagination calculation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
