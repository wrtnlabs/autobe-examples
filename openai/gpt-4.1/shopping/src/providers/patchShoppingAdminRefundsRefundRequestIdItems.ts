import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { IPageIShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequestItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminRefundsRefundRequestIdItems(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequestItem.IRequest;
}): Promise<IPageIShoppingRefundRequestItem.ISummary> {
  const { admin, refundRequestId, body } = props;

  // 1. Ensure refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: refundRequestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  // 2. Parse pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build where clause for refund items
  const where: Record<string, unknown> = {
    shopping_refund_request_id: refundRequestId,
  };
  if (body.order_line_id !== undefined && body.order_line_id !== null) {
    where.order_line_id = body.order_line_id;
  }

  // 4. Filter by SKU code if provided (requires join through order lines → skus)
  if (body.sku_code !== undefined && body.sku_code !== null) {
    const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
      where: {
        sku: {
          sku_code: body.sku_code,
        },
      },
      select: { id: true },
    });
    const relevantOrderLineIds = orderLines.map((line) => line.id);
    if (relevantOrderLineIds.length === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.order_line_id = { in: relevantOrderLineIds };
  }

  // 5. Count for pagination
  const total = await MyGlobal.prisma.shopping_refund_request_items.count({
    where,
  });

  // 6. Fetch paginated refund request items
  const items = await MyGlobal.prisma.shopping_refund_request_items.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });

  // 7. Map to DTO
  const data = items.map((item) => ({
    id: item.id,
    shopping_refund_request_id: item.shopping_refund_request_id,
    order_line_id: item.shopping_order_line_id,
    quantity: item.quantity,
    item_business_reason: item.item_business_reason ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
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
