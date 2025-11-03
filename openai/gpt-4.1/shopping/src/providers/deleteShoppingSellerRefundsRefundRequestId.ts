import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerRefundsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch refund request to ensure it exists and is not already deleted
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
  });
  if (!refund || refund.deleted_at !== null) {
    throw new HttpException("Refund request not found or already deleted", 404);
  }
  // Check that the actor is a seller and matches the authenticated seller
  if (
    refund.actor_type !== "seller" ||
    refund.shopping_actor_id !== props.seller.id
  ) {
    throw new HttpException(
      "Forbidden: Only the original seller can delete this refund request",
      403,
    );
  }
  // Prevent deletion if in a locked status (extend as needed)
  const lockedStatuses = ["under_review", "locked"];
  if (lockedStatuses.includes(refund.status)) {
    throw new HttpException(
      "Refund request cannot be deleted in the current state",
      403,
    );
  }
  // Perform soft delete by populating deleted_at
  await MyGlobal.prisma.shopping_refund_requests.update({
    where: { id: props.refundRequestId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
