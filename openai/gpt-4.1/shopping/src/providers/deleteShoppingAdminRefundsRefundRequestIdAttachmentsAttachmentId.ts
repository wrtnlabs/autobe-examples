import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminRefundsRefundRequestIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the attachment ensuring it is linked to the refund request
  const attachment =
    await MyGlobal.prisma.shopping_refund_attachments.findFirst({
      where: {
        id: props.attachmentId,
        shopping_refund_request_id: props.refundRequestId,
      },
      select: { id: true },
    });
  if (!attachment) {
    throw new HttpException(
      "Attachment not found for this refund request",
      404,
    );
  }
  // Hard delete (physical removal, no soft delete field)
  await MyGlobal.prisma.shopping_refund_attachments.delete({
    where: { id: props.attachmentId },
  });
}
