import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { IPageIShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerRefundsRefundRequestIdAttachments(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundAttachment.IRequest;
}): Promise<IPageIShoppingRefundAttachment.ISummary> {
  // 1. Check that the refund request exists and belongs to this customer
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        shopping_actor_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found or access denied", 404);
  }
  // 2. Build Prisma where condition
  const page = props.body.page ?? 1;
  const limit = (() => {
    const l = props.body.limit ?? 20;
    return l > 100 ? 100 : l;
  })();
  const skip = (page - 1) * limit;
  // Build uploaded_at filter range
  let uploadedAtCond: Record<string, string> = {};
  if (props.body.uploaded_after !== undefined) {
    uploadedAtCond.gte = props.body.uploaded_after;
  }
  if (props.body.uploaded_before !== undefined) {
    uploadedAtCond.lte = props.body.uploaded_before;
  }

  const where = {
    shopping_refund_request_id: props.refundRequestId,
    deleted_at: null,
    ...(props.body.attachment_type !== undefined && {
      attachment_type: props.body.attachment_type,
    }),
    ...(Object.keys(uploadedAtCond).length > 0 && {
      uploaded_at: uploadedAtCond,
    }),
    ...(props.body.keyword !== undefined &&
      props.body.keyword.trim().length > 0 && {
        description: { contains: props.body.keyword },
      }),
  };

  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.shopping_refund_attachments.findMany({
      where,
      orderBy: { uploaded_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_refund_attachments.count({ where }),
  ]);

  const data = attachments.map((row) => ({
    id: row.id,
    shopping_refund_request_id: row.shopping_refund_request_id,
    shopping_refund_request_item_id:
      row.shopping_refund_request_item_id ?? null,
    attachment_file_id: row.attachment_file_id,
    attachment_type: row.attachment_type,
    description: row.description ?? null,
    uploaded_at: toISOStringSafe(row.uploaded_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
