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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminRefundsRefundRequestIdAttachments(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundAttachment.IRequest;
}): Promise<IPageIShoppingRefundAttachment.ISummary> {
  const { refundRequestId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build uploaded_at filter
  let uploadedAt: { gte?: string; lte?: string } = {};
  if (body.uploaded_after !== undefined) {
    uploadedAt.gte = body.uploaded_after;
  }
  if (body.uploaded_before !== undefined) {
    uploadedAt.lte = body.uploaded_before;
  }

  // Compose where clause
  const where = {
    shopping_refund_request_id: refundRequestId,
    ...(body.attachment_type !== undefined && {
      attachment_type: body.attachment_type,
    }),
    ...(Object.keys(uploadedAt).length > 0 && {
      uploaded_at: uploadedAt,
    }),
    ...(body.keyword !== undefined &&
      body.keyword.length > 0 && {
        description: { contains: body.keyword },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_refund_attachments.findMany({
      where,
      orderBy: { uploaded_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_refund_attachments.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_refund_request_id: row.shopping_refund_request_id,
    shopping_refund_request_item_id:
      row.shopping_refund_request_item_id === null
        ? undefined
        : row.shopping_refund_request_item_id,
    attachment_file_id: row.attachment_file_id,
    attachment_type: row.attachment_type,
    description: row.description ?? undefined,
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
