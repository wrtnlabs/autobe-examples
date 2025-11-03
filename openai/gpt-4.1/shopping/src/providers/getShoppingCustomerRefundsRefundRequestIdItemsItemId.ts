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

export async function getShoppingCustomerRefundsRefundRequestIdItemsItemId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundRequestItem> {
  // Fetch the refund request item and join parent refund request for ownership check
  const item = await MyGlobal.prisma.shopping_refund_request_items.findUnique({
    where: { id: props.itemId },
    include: {
      refundRequest: true,
    },
  });
  if (!item || item.shopping_refund_request_id !== props.refundRequestId) {
    throw new HttpException("Refund request item not found", 404);
  }
  if (
    !item.refundRequest ||
    item.refundRequest.actor_type !== "customer" ||
    item.refundRequest.shopping_actor_id !== props.customer.id
  ) {
    throw new HttpException(
      "You are not authorized to access this refund request item",
      403,
    );
  }
  // Get attachments for this item
  const attachments =
    await MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: {
        shopping_refund_request_id: props.refundRequestId,
        shopping_refund_request_item_id: props.itemId,
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
  // Get image metadata from shopping_product_images for all attachment_file_ids
  const fileIds = attachments.map((att) => att.attachment_file_id);
  const files = await MyGlobal.prisma.shopping_product_images.findMany({
    where: { id: { in: fileIds } },
    select: {
      id: true,
      image_uri: true,
    },
  });
  const filesMap = new Map(files.map((f) => [f.id, f]));

  return {
    id: item.id,
    shopping_refund_request_id: item.shopping_refund_request_id,
    shopping_order_id: item.shopping_order_id,
    shopping_order_line_id: item.shopping_order_line_id,
    quantity: item.quantity,
    item_business_reason:
      typeof item.item_business_reason === "string"
        ? item.item_business_reason
        : item.item_business_reason === null
          ? null
          : undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    attachments:
      attachments.length > 0
        ? attachments.map((att) => {
            const file = filesMap.get(att.attachment_file_id);
            return {
              id: att.id,
              shopping_refund_request_id: att.shopping_refund_request_id,
              shopping_refund_request_item_id:
                att.shopping_refund_request_item_id === null
                  ? null
                  : att.shopping_refund_request_item_id,
              attachment_file_id: att.attachment_file_id,
              attachment_type: att.attachment_type,
              description:
                typeof att.description === "string"
                  ? att.description
                  : att.description === null
                    ? null
                    : undefined,
              uploaded_at: toISOStringSafe(att.uploaded_at),
              file_uri: file?.image_uri ?? "",
              file_type: "", // Not present in schema, default empty
              file_size: 0, // Not present in schema, default zero
            };
          })
        : undefined,
  };
}
