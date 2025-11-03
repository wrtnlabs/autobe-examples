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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminRefundsRefundRequestIdApprovals(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundApproval.IRequest;
}): Promise<IPageIShoppingRefundApproval.ISummary> {
  const { refundRequestId, body } = props;

  // 1. Validate refundRequest exists and is not soft-deleted
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findFirst({
      where: {
        id: refundRequestId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  // 2. Pagination enforcement
  const page = Number(body.page ?? 1);
  const pageSize = Math.min(Math.max(Number(body.pageSize ?? 20), 1), 100);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 3. Build where clause for Prisma
  const where: Record<string, unknown> = {
    shopping_refund_request_id: refundRequestId,
  };
  if (
    typeof body.actor_type === "string" &&
    (body.actor_type === "admin" || body.actor_type === "seller")
  ) {
    where.actor_type = body.actor_type;
  }
  if (typeof body.actor_id === "string") {
    where.shopping_actor_id = body.actor_id;
  }
  if (typeof body.action === "string") {
    where.action = body.action;
  }
  if (typeof body.fromCreatedAt === "string") {
    (where.created_at ??= {}) as { gte?: string; lte?: string };
    (where.created_at as { gte?: string }).gte = body.fromCreatedAt;
  }
  if (typeof body.toCreatedAt === "string") {
    (where.created_at ??= {}) as { gte?: string; lte?: string };
    (where.created_at as { lte?: string }).lte = body.toCreatedAt;
  }
  if (typeof body.has_note === "boolean") {
    if (body.has_note) {
      where.NOT = { note: null };
    } else {
      where.note = null;
    }
  }

  // 4. Query approvals and count in parallel
  const [records, total] = await Promise.all([
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

  // 5. Format and return
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: records.map((row) => ({
      id: row.id,
      shopping_refund_request_id: row.shopping_refund_request_id,
      shopping_refund_status_history_id: row.shopping_refund_status_history_id,
      shopping_actor_id: row.shopping_actor_id,
      actor_type: row.actor_type === "admin" ? "admin" : "seller",
      action: row.action,
      note: row.note ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
