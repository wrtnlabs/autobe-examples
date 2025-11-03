import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingCustomerRefundsRefundRequestIdAttachments(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundAttachment.ICreate;
}): Promise<IShoppingRefundAttachment> {
  const { customer, refundRequestId, body } = props;

  // 1. Verify the refund request exists and belongs to the customer
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findFirst({
      where: {
        id: refundRequestId,
        deleted_at: null,
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  if (
    refundRequest.shopping_actor_id !== customer.id ||
    refundRequest.actor_type !== "customer"
  ) {
    throw new HttpException(
      "You are not permitted to add attachments to this refund request",
      403,
    );
  }

  // 2. Insert refund attachment metadata (file fields not persisted in db)
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_refund_attachments.create({
    data: {
      id: v4(),
      shopping_refund_request_id: refundRequestId,
      shopping_refund_request_item_id:
        body.shopping_refund_request_item_id ?? null,
      attachment_file_id: body.attachment_file_id,
      attachment_type: body.attachment_type,
      description: body.description ?? null,
      uploaded_at: now,
      // file_uri, file_type, file_size do not exist in schema
    },
  });

  return {
    id: created.id,
    shopping_refund_request_id: created.shopping_refund_request_id,
    shopping_refund_request_item_id:
      created.shopping_refund_request_item_id ?? null,
    attachment_file_id: created.attachment_file_id,
    attachment_type: created.attachment_type,
    description: created.description ?? null,
    uploaded_at: toISOStringSafe(created.uploaded_at),
    file_uri: body.file_uri,
    file_type: body.file_type,
    file_size: body.file_size,
  };
}
