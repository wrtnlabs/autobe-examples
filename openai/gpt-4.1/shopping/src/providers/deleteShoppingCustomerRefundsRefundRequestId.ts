import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerRefundsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the refund request
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // 2. Auth: Only the customer actor who created this can delete
  if (
    refundRequest.actor_type !== "customer" ||
    refundRequest.shopping_actor_id !== props.customer.id
  ) {
    throw new HttpException(
      "You do not have permission to delete this refund request",
      403,
    );
  }
  // 3. Only allow deletion for eligible statuses (pending only)
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request cannot be deleted due to its current status",
      409,
    );
  }
  // 4. Soft delete: set deleted_at
  await MyGlobal.prisma.shopping_refund_requests.update({
    where: { id: props.refundRequestId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // 5. AUDIT LOGGING: Omitted (DTO for audit-log not provided)
}
