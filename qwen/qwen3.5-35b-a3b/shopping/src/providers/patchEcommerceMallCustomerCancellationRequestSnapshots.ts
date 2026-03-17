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

export async function patchEcommerceMallCustomerCancellationRequestSnapshots(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get customer's cancellation request IDs for data isolation
  const customerCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const cancellationRequestIds = customerCancellationRequests.map(
    (cr) => cr.id,
  );
  // Build WHERE clause for snapshot filtering
  const whereInput: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      // Date range filters
      ...(props.body.created_at_from && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
      ...(props.body.created_at_to && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
      // Exact match filters
      ...(props.body.actor_type !== undefined && {
        actor_type: props.body.actor_type,
      }),
      ...(props.body.status_before !== undefined && {
        status_before: props.body.status_before,
      }),
      ...(props.body.status_after !== undefined && {
        status_after: props.body.status_after,
      }),
      ...(props.body.action !== undefined && { action: props.body.action }),
      ...(props.body.cancellation_request_id && {
        cancellation_request_id: props.body.cancellation_request_id,
      }),
      // Customer isolation - only snapshots for customer's own cancellation requests
      cancellation_request_id: {
        in: cancellationRequestIds,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // Query paginated snapshots with transformer select
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total records for pagination metadata
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
