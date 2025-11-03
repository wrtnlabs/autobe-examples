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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerRefundsRefundRequestIdApprovals(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundApproval.IRequest;
}): Promise<IPageIShoppingRefundApproval.ISummary> {
  // Confirm ownership: Only the customer who created the refund request can see its approval history
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (!refundRequest || refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.shopping_actor_id !== props.customer.id) {
    throw new HttpException("Forbidden: not your refund request", 403);
  }

  const {
    page,
    pageSize,
    actor_type,
    actor_id,
    action,
    fromCreatedAt,
    toCreatedAt,
    has_note,
  } = props.body;

  // Build 'where' filter for Prisma
  const where: Record<string, unknown> = {
    shopping_refund_request_id: props.refundRequestId,
    ...(actor_type !== undefined && { actor_type }),
    ...(actor_id !== undefined && { shopping_actor_id: actor_id }),
    ...(action !== undefined && { action }),
  };
  // Date range handling
  if (fromCreatedAt !== undefined && toCreatedAt !== undefined) {
    where.created_at = { gte: fromCreatedAt, lte: toCreatedAt };
  } else if (fromCreatedAt !== undefined) {
    where.created_at = { gte: fromCreatedAt };
  } else if (toCreatedAt !== undefined) {
    where.created_at = { lte: toCreatedAt };
  }
  // Note filter (has_note)
  if (has_note !== undefined) {
    if (has_note) {
      where.NOT = { note: null };
    } else {
      where.note = null;
    }
  }

  // Pagination calculations using Number() to strip brand types
  const skip = Number(page - 1) * Number(pageSize);
  const take = Number(pageSize);

  // Query paginated, filtered data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_refund_approvals.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_refund_status_history_id: true,
        shopping_actor_id: true,
        actor_type: true,
        action: true,
        note: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_refund_approvals.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_refund_request_id: row.shopping_refund_request_id,
      shopping_refund_status_history_id: row.shopping_refund_status_history_id,
      shopping_actor_id: row.shopping_actor_id,
      actor_type: typia.assert<"seller" | "admin">(row.actor_type),
      action: row.action,
      note: row.note ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
