import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdItemsItemIdCancellationRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceCancellationRequestSnapshot.ISummary> {
  // Validate order exists
  await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Validate order item belongs to the order
  await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
    },
  });
  // Validate cancellation request belongs to the order item
  await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
    where: {
      id: props.requestId,
      ecommerce_order_item_id: props.itemId,
    },
  });
  // Build where clause for snapshots
  const whereInput: Prisma.ecommerce_cancellation_request_snapshotsWhereInput =
    {
      ecommerce_cancellation_request_id: props.requestId,
      ...(props.body.status_before && {
        status_before: props.body.status_before,
      }),
      ...(props.body.status_after && {
        status_after: props.body.status_after,
      }),
      ...(props.body.changed_by_actor_type && {
        changed_by_actor_type: props.body.changed_by_actor_type,
      }),
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
    } satisfies Prisma.ecommerce_cancellation_request_snapshotsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Fetch records
  const records =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCancellationRequestSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.count({
      where: whereInput,
    });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceCancellationRequestSnapshot.ISummary;
}
