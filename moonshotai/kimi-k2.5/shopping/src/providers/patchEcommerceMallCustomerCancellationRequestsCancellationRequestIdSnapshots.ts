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
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  // Authorization check - verify cancellation request exists and customer owns it
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          orderItem: {
            select: {
              order: {
                select: {
                  customer_id: true,
                },
              },
            },
          },
        },
      },
    );
  // Verify ownership - customer must own the order
  if (cancellationRequest.orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters with proper type casting for typia tags
  const page = (props.body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (props.body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;
  // Build date range filter
  const dateFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    dateFilter.gte = new Date(props.body.created_at_from);
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    dateFilter.lte = new Date(props.body.created_at_to);
  }
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      cancellation_request_id: props.cancellationRequestId,
      ...(props.body.status_before !== undefined &&
        props.body.status_before !== null && {
          status_before: props.body.status_before,
        }),
      ...(props.body.status_after !== undefined &&
        props.body.status_after !== null && {
          status_after: props.body.status_after,
        }),
      ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
    };
  // Handle sort - validate fields
  const allowedSortFields = [
    "created_at",
    "id",
    "status_before",
    "status_after",
  ];
  const sortParts = props.body.sort?.split(":") ?? ["created_at", "desc"];
  const sortField = allowedSortFields.includes(sortParts[0] ?? "")
    ? sortParts[0]
    : "created_at";
  const sortDirection = sortParts[1] === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput =
    {
      [sortField]: sortDirection,
    };
  // Query count and data
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
  );
  // Build pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
