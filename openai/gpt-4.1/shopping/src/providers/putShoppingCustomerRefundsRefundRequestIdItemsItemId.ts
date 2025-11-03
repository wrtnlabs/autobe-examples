import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerRefundsRefundRequestIdItemsItemId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequestItem.IUpdate;
}): Promise<IShoppingRefundRequestItem> {
  // Find the refund request item by ID and refund request ID, ensure the parent exists and belongs to the customer
  const item = await MyGlobal.prisma.shopping_refund_request_items.findUnique({
    where: { id: props.itemId },
  });
  if (!item || item.shopping_refund_request_id !== props.refundRequestId) {
    throw new HttpException(
      "Refund request item not found in specified refund request",
      404,
    );
  }
  // Find the parent refund request
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
  });
  if (!refund) {
    throw new HttpException("Refund request not found", 404);
  }
  // Authz: must be requestor
  if (refund.shopping_actor_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: You do not own this refund request",
      403,
    );
  }
  // Only open status allowed for edits
  if (["completed", "declined", "approved"].includes(refund.status)) {
    throw new HttpException(
      "Cannot edit an already completed or finalized refund request",
      400,
    );
  }
  // Validate: quantity must not exceed original order line quantity
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findUnique({
    where: { id: item.shopping_order_line_id },
  });
  if (!orderLine) {
    throw new HttpException("Associated order line not found", 400);
  }
  if (props.body.quantity > orderLine.quantity || props.body.quantity < 1) {
    throw new HttpException(
      "Requested quantity is out of bounds for the order line",
      400,
    );
  }
  // Calculate updated_at
  const now = toISOStringSafe(new Date());
  // Update the refund request item
  const updated = await MyGlobal.prisma.shopping_refund_request_items.update({
    where: { id: props.itemId },
    data: {
      quantity: props.body.quantity,
      item_business_reason: props.body.item_business_reason ?? undefined,
      updated_at: now,
    },
  });
  // Fetch attachments for this itemId, including file info from related entity
  const attachments =
    await MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: { shopping_refund_request_item_id: props.itemId },
      include: { attachmentFile: true },
    });
  // Map attachments to DTO format; fallback for missing file_type/file_size
  const mappedAttachments = attachments.map((att) => ({
    id: att.id,
    shopping_refund_request_id: att.shopping_refund_request_id,
    shopping_refund_request_item_id:
      att.shopping_refund_request_item_id ?? undefined,
    attachment_file_id: att.attachment_file_id,
    attachment_type: att.attachment_type,
    description: att.description ?? undefined,
    uploaded_at: toISOStringSafe(att.uploaded_at),
    file_uri: att.attachmentFile?.image_uri ?? "", // use image_uri from product_images as file_uri
    file_type: "image/*", // can only provide generic
    file_size: 0, // product_images has no file_size field, so use 0
  }));
  return {
    id: updated.id,
    shopping_refund_request_id: updated.shopping_refund_request_id,
    shopping_order_id: updated.shopping_order_id,
    shopping_order_line_id: updated.shopping_order_line_id,
    quantity: updated.quantity,
    item_business_reason: updated.item_business_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    attachments: mappedAttachments.length > 0 ? mappedAttachments : undefined,
  };
}
