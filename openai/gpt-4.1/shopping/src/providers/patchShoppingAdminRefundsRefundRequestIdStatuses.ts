import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import { IPageIShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminRefundsRefundRequestIdStatuses(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundStatusHistory.IRequest;
}): Promise<IPageIShoppingRefundStatusHistory> {
  // Check that the refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: { id: true },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  // Parse and bound pagination
  const rawPage = props.body.page ?? 1;
  const rawLimit = props.body.limit ?? 20;
  const page = rawPage < 1 ? 1 : rawPage;
  const limit = rawLimit < 1 ? 1 : rawLimit > 100 ? 100 : rawLimit;
  const skip = (Number(page) - 1) * Number(limit);

  // Build the where filter
  const where: Record<string, any> = {
    shopping_refund_request_id: props.refundRequestId,
  };
  if (props.body.actor_type) {
    where.actor_type = props.body.actor_type;
  }
  if (props.body.from_date) {
    where.timestamp = { ...(where.timestamp ?? {}), gte: props.body.from_date };
  }
  if (props.body.to_date) {
    where.timestamp = { ...(where.timestamp ?? {}), lte: props.body.to_date };
  }
  if (
    props.body.status_transition &&
    typeof props.body.status_transition === "string"
  ) {
    // Only filter if pattern is 'prev_to_next'
    const idx = props.body.status_transition.indexOf("_to_");
    if (idx > 0) {
      const prev = props.body.status_transition.slice(0, idx);
      const next = props.body.status_transition.slice(idx + 4);
      where.previous_status = prev;
      where.new_status = next;
    }
  }

  const total = await MyGlobal.prisma.shopping_refund_status_histories.count({
    where,
  });

  const rows = await MyGlobal.prisma.shopping_refund_status_histories.findMany({
    where,
    orderBy: { timestamp: props.body.sort === "desc" ? "desc" : "asc" },
    skip: Number(skip),
    take: Number(limit),
  });

  const data = rows.map((row) => ({
    id: row.id,
    shopping_refund_request_id: row.shopping_refund_request_id,
    shopping_actor_id: row.shopping_actor_id,
    actor_type: typia.assert<"customer" | "seller" | "admin">(row.actor_type),
    previous_status: row.previous_status,
    new_status: row.new_status,
    timestamp: toISOStringSafe(row.timestamp),
    ...(row.change_context !== null && row.change_context !== undefined
      ? { change_context: row.change_context }
      : {}),
  }));

  const pages = Math.ceil(total / Number(limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
