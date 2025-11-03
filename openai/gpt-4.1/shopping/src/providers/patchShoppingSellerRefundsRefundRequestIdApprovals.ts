import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import { IPageIShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundApproval";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerRefundsRefundRequestIdApprovals(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundApproval.IRequest;
}): Promise<IPageIShoppingRefundApproval.ISummary> {
  const { seller, refundRequestId, body } = props;

  // Check: Refund request exists and is linked to at least one order line for this seller
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: refundRequestId, deleted_at: null },
      include: {
        shopping_refund_request_items: {
          select: { shopping_order_line_id: true },
        },
      },
    });
  if (!refundRequest) throw new HttpException("Refund request not found", 404);
  const orderLineIds = refundRequest.shopping_refund_request_items.map(
    (item) => item.shopping_order_line_id,
  );
  if (orderLineIds.length === 0)
    throw new HttpException("No order lines in refund request", 404);
  const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: { id: { in: orderLineIds } },
    select: { shopping_seller_id: true },
  });
  const related = orderLines.some(
    (line) => line.shopping_seller_id === seller.id,
  );
  if (!related)
    throw new HttpException(
      "Forbidden: you are not related to this refund request",
      403,
    );

  // Pagination
  const page = body.page > 0 ? Number(body.page) : 1;
  const pageSize = Math.min(Math.max(Number(body.pageSize), 1), 100);

  // Build where filter
  const where: Record<string, unknown> = {
    shopping_refund_request_id: refundRequestId,
  };
  if (body.actor_type !== undefined) where.actor_type = body.actor_type;
  if (body.actor_id !== undefined) where.shopping_actor_id = body.actor_id;
  if (body.action !== undefined) where.action = body.action;
  if (body.fromCreatedAt !== undefined || body.toCreatedAt !== undefined) {
    where.created_at = {};
    if (body.fromCreatedAt !== undefined)
      (where.created_at as Record<string, unknown>).gte = body.fromCreatedAt;
    if (body.toCreatedAt !== undefined)
      (where.created_at as Record<string, unknown>).lte = body.toCreatedAt;
  }
  if (body.has_note === true) {
    where.note = { not: null };
  } else if (body.has_note === false) {
    where.note = null;
  }

  // Query total
  const total = await MyGlobal.prisma.shopping_refund_approvals.count({
    where,
  });
  // Query approval list
  const resultRows = await MyGlobal.prisma.shopping_refund_approvals.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  // Map to ISummary[]
  const data = resultRows.map((r) => ({
    id: r.id,
    shopping_refund_request_id: r.shopping_refund_request_id,
    shopping_refund_status_history_id: r.shopping_refund_status_history_id,
    shopping_actor_id: r.shopping_actor_id,
    actor_type: typia.assert<"admin" | "seller">(
      r.actor_type === "admin" ? "admin" : "seller",
    ),
    action: r.action,
    note: r.note !== null && r.note !== undefined ? r.note : undefined,
    created_at: toISOStringSafe(r.created_at),
  }));
  const pages = Math.ceil(total / pageSize);
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
