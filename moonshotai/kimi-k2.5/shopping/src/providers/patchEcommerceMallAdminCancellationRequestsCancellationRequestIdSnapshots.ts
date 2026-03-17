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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCancellationRequestsCancellationRequestIdSnapshots(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  // Verify cancellation request exists (will throw 404 if not found)
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
    where: { id: props.cancellationRequestId },
  });
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 100) satisfies number as number;
  const skip = (page - 1) * limit;
  // Build created_at range filter
  const createdAtFilter:
    | Prisma.DateTimeFilter<"ecommerce_mall_cancellation_request_snapshots">
    | undefined =
    (props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null)
      ? {
          ...(props.body.created_at_from !== undefined &&
            props.body.created_at_from !== null && {
              gte: new Date(props.body.created_at_from),
            }),
          ...(props.body.created_at_to !== undefined &&
            props.body.created_at_to !== null && {
              lte: new Date(props.body.created_at_to),
            }),
        }
      : undefined;
  // Build where clause with filters
  const whereInput = {
    cancellation_request_id: props.cancellationRequestId,
    ...(props.body.status_before !== undefined &&
      props.body.status_before !== null && {
        status_before: props.body.status_before,
      }),
    ...(props.body.status_after !== undefined &&
      props.body.status_after !== null && {
        status_after: props.body.status_after,
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // Determine sort order
  const sortDirection = props.body.sort?.endsWith(":asc") ? "asc" : "desc";
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: sortDirection },
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total records for pagination
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
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
