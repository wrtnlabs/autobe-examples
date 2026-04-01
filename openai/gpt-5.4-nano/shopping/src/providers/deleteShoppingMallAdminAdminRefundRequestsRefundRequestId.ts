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
  // Admin authorization is enforced by the route decorator/guard.
  await MyGlobal.prisma.$transaction(async (tx) => {
    const refundRequest = await tx.shopping_mall_refund_requests.findFirst({
      where: { id: props.refundRequestId, deleted_at: null },
      select: { id: true, status: true },
    });
    if (refundRequest === null) {
      throw new HttpException("Refund request not found", 404);
    }
    // Snapshot integrity: never erase if an immutable snapshot for this refund request exists.
    const hasImmutableSnapshot = await tx.shopping_mall_snapshots.findFirst({
      where: {
        source_refund_request_id: refundRequest.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (hasImmutableSnapshot !== null) {
      throw new HttpException(
        "Cannot erase refund request after immutable decision snapshot was created",
        400,
      );
    }
    await tx.shopping_mall_refund_requests.delete({
      where: { id: refundRequest.id },
    });
  });
}
