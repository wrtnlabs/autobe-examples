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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          mall_platform_order_item_id: true,
          orderItem: {
            select: {
              id: true,
              mall_platform_seller_id: true,
            },
          },
        },
      },
    );
  if (cancellationRequest.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    cancellationRequest.orderItem.mall_platform_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const where = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
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
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "changedAt"
        ? { changed_at: "desc" }
        : props.body.sort === "status"
          ? { snapshot_status: "asc" }
          : { created_at: "desc" }
  ) satisfies Prisma.mall_platform_cancellation_request_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
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
  const total =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.count({
      where,
    });
  return {
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          cancellationRequest: {
            id: cancellationRequest.id,
          },
          snapshotStatus: snapshot.snapshot_status,
          reviewResult: snapshot.review_result,
          reason: snapshot.reason,
          changedAt: toISOStringSafe(snapshot.changed_at),
          createdAt: toISOStringSafe(snapshot.created_at),
          updatedAt: toISOStringSafe(snapshot.updated_at),
          deletedAt: snapshot.deleted_at
            ? toISOStringSafe(snapshot.deleted_at)
            : null,
        }) satisfies IMallPlatformCancellationRequestSnapshot.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
