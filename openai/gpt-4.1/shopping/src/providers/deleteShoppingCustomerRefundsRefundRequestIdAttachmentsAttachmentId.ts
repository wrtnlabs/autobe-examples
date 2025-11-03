import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerRefundsRefundRequestIdAttachmentsAttachmentId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the attachment
  const attachment =
    await MyGlobal.prisma.shopping_refund_attachments.findUnique({
      where: { id: props.attachmentId },
      select: {
        id: true,
        shopping_refund_request_id: true,
      },
    });
  if (
    !attachment ||
    attachment.shopping_refund_request_id !== props.refundRequestId
  ) {
    throw new HttpException("Attachment not found for refund request", 404);
  }
  // Step 2: Check ownership
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        shopping_actor_id: true,
        actor_type: true,
        id: true,
      },
    });
  if (!refundRequest || refundRequest.shopping_actor_id !== props.customer.id) {
    throw new HttpException("Not authorized to delete this attachment", 403);
  }
  // Step 3: Physically delete the attachment record
  await MyGlobal.prisma.shopping_refund_attachments.delete({
    where: { id: props.attachmentId },
  });
}
