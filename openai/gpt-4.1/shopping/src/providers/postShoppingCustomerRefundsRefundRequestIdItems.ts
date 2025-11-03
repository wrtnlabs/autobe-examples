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

export async function postShoppingCustomerRefundsRefundRequestIdItems(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequestItem.ICreate;
}): Promise<IShoppingRefundRequestItem> {
  const now = toISOStringSafe(new Date());
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
    select: {
      id: true,
      shopping_order_id: true,
      shopping_actor_id: true,
      actor_type: true,
      status: true,
      deleted_at: true,
    },
  });
  if (!refund || refund.deleted_at !== null) {
    throw new HttpException("Refund request not found.", 404);
  }
  if (
    refund.shopping_actor_id !== props.customer.id ||
    refund.actor_type !== "customer"
  ) {
    throw new HttpException(
      "Not authorized to add to this refund request.",
      403,
    );
  }
  if (["completed", "closed", "declined"].includes(refund.status)) {
    throw new HttpException(
      "Refund request is not open for modification.",
      409,
    );
  }
  const exists = await MyGlobal.prisma.shopping_refund_request_items.findFirst({
    where: {
      shopping_refund_request_id: props.refundRequestId,
      shopping_order_line_id: props.body.shopping_order_line_id,
    },
    select: { id: true },
  });
  if (exists) {
    throw new HttpException("Duplicate refund item for this order line.", 409);
  }
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findUnique({
    where: { id: props.body.shopping_order_line_id },
    select: {
      id: true,
      shopping_order_id: true,
      quantity: true,
      deleted_at: true,
    },
  });
  if (!orderLine || orderLine.deleted_at !== null) {
    throw new HttpException("Order line not found.", 404);
  }
  if (orderLine.shopping_order_id !== props.body.shopping_order_id) {
    throw new HttpException("Order line does not belong to given order.", 400);
  }
  if (refund.shopping_order_id !== orderLine.shopping_order_id) {
    throw new HttpException(
      "Refund request does not match the order of the line item.",
      400,
    );
  }
  const requested =
    await MyGlobal.prisma.shopping_refund_request_items.aggregate({
      where: {
        shopping_order_line_id: orderLine.id,
        shopping_order_id: orderLine.shopping_order_id,
        shopping_refund_request_id: props.refundRequestId,
      },
      _sum: { quantity: true },
    });
  const alreadyRequested = requested._sum.quantity ?? 0;
  if (
    props.body.quantity < 1 ||
    props.body.quantity + alreadyRequested > orderLine.quantity
  ) {
    throw new HttpException(
      "Requested quantity exceeds available for refund.",
      400,
    );
  }
  const refundItem = await MyGlobal.prisma.shopping_refund_request_items.create(
    {
      data: {
        id: v4(),
        shopping_refund_request_id: props.refundRequestId,
        shopping_order_id: orderLine.shopping_order_id,
        shopping_order_line_id: orderLine.id,
        quantity: props.body.quantity,
        item_business_reason: props.body.item_business_reason ?? null,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_order_id: true,
        shopping_order_line_id: true,
        quantity: true,
        item_business_reason: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  let attachments: IShoppingRefundAttachment[] | undefined = undefined;
  if (props.body.attachments && props.body.attachments.length > 0) {
    const attachRecords = await Promise.all(
      props.body.attachments.map(async (att) => {
        const attNow = toISOStringSafe(new Date());
        const record = await MyGlobal.prisma.shopping_refund_attachments.create(
          {
            data: {
              id: v4(),
              shopping_refund_request_id: props.refundRequestId,
              shopping_refund_request_item_id: refundItem.id,
              attachment_file_id: att.attachment_file_id,
              attachment_type: att.attachment_type,
              description: att.description ?? null,
              uploaded_at: attNow,
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
          },
        );
        return {
          id: record.id,
          shopping_refund_request_id: record.shopping_refund_request_id,
          shopping_refund_request_item_id:
            record.shopping_refund_request_item_id,
          attachment_file_id: record.attachment_file_id,
          attachment_type: record.attachment_type,
          description: record.description,
          uploaded_at: toISOStringSafe(record.uploaded_at),
          file_uri: att.file_uri ?? "",
          file_type: att.file_type ?? "",
          file_size: att.file_size ?? 0,
        } satisfies IShoppingRefundAttachment;
      }),
    );
    attachments = attachRecords;
  }
  return {
    id: refundItem.id,
    shopping_refund_request_id: refundItem.shopping_refund_request_id,
    shopping_order_id: refundItem.shopping_order_id,
    shopping_order_line_id: refundItem.shopping_order_line_id,
    quantity: refundItem.quantity,
    item_business_reason: refundItem.item_business_reason ?? null,
    created_at: toISOStringSafe(refundItem.created_at),
    updated_at: toISOStringSafe(refundItem.updated_at),
    attachments,
  };
}
