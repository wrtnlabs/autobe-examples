import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingSellerRefundsRefundRequestIdAttachments(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundAttachment.ICreate;
}): Promise<IShoppingRefundAttachment> {
  // Step 1: Confirm the refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      include: {
        order: {
          select: {
            shopping_order_lines: { select: { shopping_seller_id: true } },
          },
        },
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // Authorization: seller must be listed on the order (order lines)
  const sellerId = props.seller.id;
  const isSellerOnOrder = refundRequest.order.shopping_order_lines.some(
    (line) => line.shopping_seller_id === sellerId,
  );
  if (!isSellerOnOrder) {
    throw new HttpException(
      "Unauthorized: seller has no access to this refund request",
      403,
    );
  }
  // Step 2: Insert the attachment record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_refund_attachments.create({
    data: {
      id: v4(),
      shopping_refund_request_id: props.refundRequestId,
      shopping_refund_request_item_id:
        props.body.shopping_refund_request_item_id ?? null,
      attachment_file_id: props.body.attachment_file_id,
      attachment_type: props.body.attachment_type,
      description: props.body.description ?? null,
      uploaded_at: now,
    },
  });
  // Step 3: Compose DTO, echoing non-DB fields from the input
  return {
    id: created.id,
    shopping_refund_request_id: created.shopping_refund_request_id,
    shopping_refund_request_item_id:
      created.shopping_refund_request_item_id ?? undefined,
    attachment_file_id: created.attachment_file_id,
    attachment_type: created.attachment_type,
    description: created.description ?? undefined,
    uploaded_at: toISOStringSafe(created.uploaded_at),
    file_uri: props.body.file_uri,
    file_type: props.body.file_type,
    file_size: props.body.file_size,
  };
}
