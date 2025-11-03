import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerRefundsRefundRequestIdAttachmentsAttachmentId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate attachment exists and linked to given refundRequestId
  const attachment =
    await MyGlobal.prisma.shopping_refund_attachments.findFirst({
      where: {
        id: props.attachmentId,
        shopping_refund_request_id: props.refundRequestId,
      },
      select: { id: true, shopping_refund_request_id: true },
    });
  if (!attachment) {
    throw new HttpException(
      "Attachment not found or not linked to this refund request",
      404,
    );
  }

  // 2. Fetch refund request and check seller owns it (via order line seller matching this seller id)
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
    select: { shopping_order_id: true, status: true },
  });
  if (!refund) {
    throw new HttpException("Refund request not found", 404);
  }
  // Any order line with correct seller is sufficient for authorization
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: refund.shopping_order_id,
      shopping_seller_id: props.seller.id,
    },
    select: { id: true },
  });
  if (!orderLine) {
    throw new HttpException(
      "You are not authorized to delete attachments from this refund request",
      403,
    );
  }
  // 3. Check refund request status isn't closed/locked
  if (refund.status === "closed" || refund.status === "locked") {
    throw new HttpException(
      "Refund request is closed or locked and cannot be modified",
      409,
    );
  }
  // 4. Delete the attachment row
  await MyGlobal.prisma.shopping_refund_attachments.delete({
    where: { id: props.attachmentId },
  });

  // 5. Add audit entry (log deletion)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_system_logs.create({
    data: {
      id: v4(),
      event_time: now,
      log_level: "info",
      event_type: "refund_attachment_deleted",
      event_source: "refund_attachment_service",
      message: `Attachment ${props.attachmentId} deleted from refund request ${props.refundRequestId} by seller ${props.seller.id}`,
      details: null,
      created_at: now,
    },
  });
  // (Optional) Remove file blob from storage here if managed externally
}
