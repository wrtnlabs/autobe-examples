import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findUnique(
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
          cancellationRequest: {
            select: {
              seller_id: true,
            },
          },
        },
      },
    );
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (snapshot.cancellation_request_id !== props.cancellationRequestId) {
    throw new HttpException(
      "Snapshot does not belong to this cancellation request",
      404,
    );
  }
  if (snapshot.cancellationRequest.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    cancellationRequestId: snapshot.cancellation_request_id,
    statusBefore: snapshot.status_before,
    statusAfter: snapshot.status_after,
    reasonBefore: snapshot.reason_before,
    reasonAfter: snapshot.reason_after,
    reviewerNote: snapshot.reviewer_note,
    createdAt: snapshot.created_at.toISOString(),
  };
}
