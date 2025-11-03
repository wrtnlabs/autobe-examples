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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerRefundsRefundRequestIdStatuses(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundStatusHistory.IRequest;
}): Promise<IPageIShoppingRefundStatusHistory> {
  const { seller, refundRequestId, body } = props;

  // Validate refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findFirst({
      where: { id: refundRequestId, deleted_at: null },
      select: { shopping_order_id: true },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }

  // Ensure the seller owns at least one SKU in the order
  const sellerOrderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: refundRequest.shopping_order_id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerOrderLine) {
    throw new HttpException(
      "Forbidden: Seller does not own any SKUs in this refund request's order.",
      403,
    );
  }

  const pageNum = Number(body.page);
  const pageLimit = Number(body.limit);

  // Build filters
  const filters: {
    shopping_refund_request_id: string & tags.Format<"uuid">;
    actor_type?: "customer" | "seller" | "admin";
    timestamp?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = { shopping_refund_request_id: refundRequestId };
  if (body.actor_type) {
    filters.actor_type = body.actor_type;
  }
  if (body.from_date || body.to_date) {
    filters.timestamp = {};
    if (body.from_date) filters.timestamp.gte = body.from_date;
    if (body.to_date) filters.timestamp.lte = body.to_date;
  }

  // Fetch all histories, we'll filter status_transition in application (accurate pagination/total)
  const allHistories =
    await MyGlobal.prisma.shopping_refund_status_histories.findMany({
      where: filters,
      orderBy: { timestamp: body.sort === "desc" ? "desc" : "asc" },
    });

  // status_transition is app logic: previous_status + '_to_' + new_status
  let filtered = allHistories;
  if (body.status_transition) {
    filtered = allHistories.filter(
      (row) =>
        row.previous_status + "_to_" + row.new_status ===
        body.status_transition,
    );
  }

  const total = filtered.length;
  const pages = pageLimit > 0 ? Math.ceil(total / pageLimit) : 1;
  const offset = (pageNum - 1) * pageLimit;
  const paginated = filtered.slice(offset, offset + pageLimit);

  return {
    pagination: {
      current: pageNum,
      limit: pageLimit,
      records: total,
      pages: pages,
    },
    data: paginated.map((row) => {
      const result: IShoppingRefundStatusHistory = {
        id: row.id,
        shopping_refund_request_id: row.shopping_refund_request_id,
        shopping_actor_id: row.shopping_actor_id,
        actor_type: typia.assert<"customer" | "seller" | "admin">(
          row.actor_type,
        ),
        previous_status: row.previous_status,
        new_status: row.new_status,
        timestamp: toISOStringSafe(row.timestamp),
      };
      if (row.change_context !== undefined && row.change_context !== null) {
        result.change_context = row.change_context;
      }
      return result;
    }),
  };
}
