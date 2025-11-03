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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerRefundsRefundRequestIdItemsItemId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundRequestItem> {
  // Find refund item joined with order line to check both refund request and seller authorization
  const item = await MyGlobal.prisma.shopping_refund_request_items.findFirst({
    where: {
      id: props.itemId,
      shopping_refund_request_id: props.refundRequestId,
    },
    include: {
      orderLine: {
        select: {
          shopping_seller_id: true,
        },
      },
    },
  });
  if (!item) {
    throw new HttpException("Refund request item not found", 404);
  }
  if (
    !item.orderLine ||
    item.orderLine.shopping_seller_id !== props.seller.id
  ) {
    throw new HttpException("Unauthorized to access this refund item", 403);
  }

  // Fetch attachments joined with attachmentFile info
  const attachmentsRaw =
    await MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: {
        shopping_refund_request_item_id: props.itemId,
      },
      include: {
        attachmentFile: true,
      },
    });
  const attachments =
    attachmentsRaw.length > 0
      ? attachmentsRaw.map((att) => ({
          id: att.id,
          shopping_refund_request_id: att.shopping_refund_request_id,
          shopping_refund_request_item_id:
            att.shopping_refund_request_item_id ?? undefined,
          attachment_file_id: att.attachment_file_id,
          attachment_type: att.attachment_type,
          description: att.description ?? undefined,
          uploaded_at: toISOStringSafe(att.uploaded_at),
          file_uri: att.attachmentFile ? att.attachmentFile.image_uri : "",
          file_type: "",
          file_size: 0,
        }))
      : undefined;

  return {
    id: item.id,
    shopping_refund_request_id: item.shopping_refund_request_id,
    shopping_order_id: item.shopping_order_id,
    shopping_order_line_id: item.shopping_order_line_id,
    quantity: item.quantity,
    item_business_reason:
      item.item_business_reason === undefined
        ? undefined
        : item.item_business_reason,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    attachments,
  };
}
