import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const refundRequest = await tx.shopping_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (refundRequest === null) {
      throw new HttpException("Refund request not found", 404);
    }
    // Erasure is allowed only while the request is still in a non-final state.
    // (Finalized outcomes must remain traceable through snapshots.)
    if (refundRequest.status !== "pending") {
      throw new HttpException(
        "Refund request cannot be erased in its current status",
        400,
      );
    }
    const snapshotExists = await tx.shopping_mall_snapshots.findFirst({
      where: {
        source_refund_request_id: props.refundRequestId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (snapshotExists !== null) {
      throw new HttpException(
        "Refund request erase blocked by existing snapshot history",
        409,
      );
    }
    await tx.shopping_mall_refund_requests.delete({
      where: { id: props.refundRequestId },
    });
  });
}
