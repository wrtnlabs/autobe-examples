import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminRefundsRefundRequestIdItemsItemId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the refund request item and verify its parent refundRequestId
  const item = await MyGlobal.prisma.shopping_refund_request_items.findUnique({
    where: { id: props.itemId },
    select: { id: true, shopping_refund_request_id: true },
  });
  if (!item || item.shopping_refund_request_id !== props.refundRequestId) {
    throw new HttpException(
      "Refund request item not found for specified refundRequestId",
      404,
    );
  }

  // Get the parent refund request for status
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
    select: { status: true },
  });
  if (!refund) {
    throw new HttpException("Refund request not found", 404);
  }

  // Only allow delete for pending/draft refund status per business rules
  if (refund.status !== "pending" && refund.status !== "draft") {
    throw new HttpException(
      "Cannot delete item: refund is not in a modifiable state",
      409,
    );
  }

  // Delete the refund request item
  await MyGlobal.prisma.shopping_refund_request_items.delete({
    where: { id: props.itemId },
  });

  // Audit log for admin action
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: undefined,
      customer_id: undefined,
      category: "refund",
      event_type: "ADMIN_DELETE_REFUND_ITEM",
      ip: undefined,
      description: `Admin deleted refund item ${props.itemId} from refund ${props.refundRequestId}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: undefined,
    },
  });
}
