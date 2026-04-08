import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string;
  snapshotId: string;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  // Query snapshot
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          cancellation_request_id: true,
          status_before: true,
          status_after: true,
          reason_before: true,
          reason_after: true,
          reviewer_note: true,
          created_at: true,
        },
      },
    );
  // Verify snapshot belongs to the specified cancellation request
  if (snapshot.cancellation_request_id !== props.cancellationRequestId) {
    throw new HttpException(
      "Snapshot not found for this cancellation request",
      404,
    );
  }
  // Query cancellation request with order item and order to verify ownership
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
  // Verify customer owns the cancellation request
  if (cancellationRequest.orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the snapshot
  return {
    id: snapshot.id,
    cancellationRequestId: snapshot.cancellation_request_id,
    statusBefore: snapshot.status_before,
    statusAfter: snapshot.status_after,
    reasonBefore: snapshot.reason_before,
    reasonAfter: snapshot.reason_after,
    reviewerNote: snapshot.reviewer_note,
    createdAt: toISOStringSafe(snapshot.created_at),
  };
}
