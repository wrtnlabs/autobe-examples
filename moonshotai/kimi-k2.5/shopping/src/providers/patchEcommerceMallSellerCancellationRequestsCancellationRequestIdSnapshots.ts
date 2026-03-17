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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  // Find the cancellation request and verify it exists
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        seller_id: true,
        orderItem: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify seller authorization - seller must be the one assigned to the cancellation request
  // or the seller who owns the order item
  const authorizedSellerId =
    cancellationRequest.seller_id ?? cancellationRequest.orderItem?.seller_id;
  if (authorizedSellerId !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse sort parameter (default: created_at:desc)
  const sortParts = (props.body.sort ?? "created_at:desc").split(":");
  const sortField = sortParts[0] ?? "created_at";
  const sortDirection = sortParts[1] === "asc" ? "asc" : "desc";
  // Build date range filter for created_at
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_at_from != null || props.body.created_at_to != null
      ? {
          ...(props.body.created_at_from != null && {
            gte: new Date(props.body.created_at_from),
          }),
          ...(props.body.created_at_to != null && {
            lte: new Date(props.body.created_at_to),
          }),
        }
      : undefined;
  // Build where clause with filters
  const whereInput = {
    cancellation_request_id: props.cancellationRequestId,
    ...(props.body.status_before != null && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after != null && {
      status_after: props.body.status_after,
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDirection },
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total records
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
