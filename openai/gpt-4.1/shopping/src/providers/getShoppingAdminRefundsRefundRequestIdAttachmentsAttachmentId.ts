import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminRefundsRefundRequestIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundAttachment> {
  const attachment =
    await MyGlobal.prisma.shopping_refund_attachments.findFirst({
      where: {
        id: props.attachmentId,
        shopping_refund_request_id: props.refundRequestId,
      },
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_refund_request_item_id: true,
        attachment_file_id: true,
        attachment_type: true,
        description: true,
        uploaded_at: true,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  // Fetch file info from shopping_product_images using attachment_file_id
  const file = await MyGlobal.prisma.shopping_product_images.findFirst({
    where: { id: attachment.attachment_file_id },
    select: {
      id: true,
      image_uri: true,
      // No type or size in schema, so return placeholder values (or throw error if not found)
    },
  });
  if (!file) {
    throw new HttpException("Attachment file not found", 404);
  }
  return {
    id: attachment.id,
    shopping_refund_request_id: attachment.shopping_refund_request_id,
    shopping_refund_request_item_id:
      attachment.shopping_refund_request_item_id ?? undefined,
    attachment_file_id: attachment.attachment_file_id,
    attachment_type: attachment.attachment_type,
    description: attachment.description ?? undefined,
    uploaded_at: toISOStringSafe(attachment.uploaded_at),
    file_uri: file.image_uri,
    file_type: "application/octet-stream", // Placeholder (unknown in schema)
    file_size: 0 as number & tags.Type<"int32">, // Placeholder (unknown in schema)
  };
}
