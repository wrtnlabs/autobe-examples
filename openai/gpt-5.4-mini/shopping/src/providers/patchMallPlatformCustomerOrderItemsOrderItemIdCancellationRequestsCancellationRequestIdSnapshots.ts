import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        mall_platform_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: { id: orderItem.mall_platform_order_id },
    select: {
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          mall_platform_order_item_id: true,
        },
      },
    );
  if (cancellationRequest.mall_platform_order_item_id !== orderItem.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const sort = props.body.sort ?? "newest";
  const where = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
    deleted_at: null,
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { snapshot_status: { contains: search, mode: "insensitive" } },
            { review_result: { contains: search, mode: "insensitive" } },
            { reason: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_cancellation_request_snapshotsWhereInput;
  const orderBy = (
    sort === "oldest"
      ? [{ changed_at: "asc" as const }, { created_at: "asc" as const }]
      : [{ created_at: "desc" as const }, { changed_at: "desc" as const }]
  ) satisfies Prisma.mall_platform_cancellation_request_snapshotsOrderByWithRelationInput[];
  const total =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.count({
      where,
    });
  const snapshots =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          snapshot_status: true,
          review_result: true,
          reason: true,
          changed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      cancellationRequest: {},
      snapshotStatus: snapshot.snapshot_status,
      reviewResult: snapshot.review_result,
      reason: snapshot.reason,
      changedAt: toISOStringSafe(snapshot.changed_at),
      createdAt: toISOStringSafe(snapshot.created_at),
      updatedAt: toISOStringSafe(snapshot.updated_at),
      deletedAt:
        snapshot.deleted_at !== null
          ? toISOStringSafe(snapshot.deleted_at)
          : null,
    })),
  };
}
