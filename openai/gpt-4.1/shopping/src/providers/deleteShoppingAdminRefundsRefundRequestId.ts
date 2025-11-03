import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminRefundsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, refundRequestId } = props;

  // Find the refund request (must exist, not already deleted)
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: refundRequestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request has already been deleted", 409);
  }
  // Check business logic for eligibility
  if (
    refundRequest.status === "under_review" ||
    refundRequest.status === "locked"
  ) {
    throw new HttpException(
      "Cannot delete refund request in locked or under_review state",
      403,
    );
  }

  // Soft-delete: set deleted_at to now (ISO 8601 format string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_refund_requests.update({
    where: { id: refundRequestId },
    data: { deleted_at: now },
  });

  // Log admin deletion event for compliance/audit
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      category: "refund_request",
      event_type: "ADMIN_REFUND_REQUEST_DELETE",
      description: `Admin ${admin.id} deleted refund request ${refundRequestId} at ${now}`,
      created_at: now,
      updated_at: now,
    },
  });
}
