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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerRefundsRefundRequestIdStatuses(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundStatusHistory.IRequest;
}): Promise<IPageIShoppingRefundStatusHistory> {
  const { customer, refundRequestId, body } = props;

  // 1. Validate refund request exists and ownership
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: refundRequestId },
      select: {
        id: true,
        shopping_actor_id: true,
        actor_type: true,
        deleted_at: true,
      },
    });
  if (!refundRequest || refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (
    refundRequest.shopping_actor_id !== customer.id ||
    refundRequest.actor_type !== "customer"
  ) {
    throw new HttpException(
      "Forbidden: Only the requesting customer can view this refund's status history",
      403,
    );
  }

  // 2. Build base where clause
  const where: Record<string, unknown> = {
    shopping_refund_request_id: refundRequestId,
  };
  if (body.actor_type !== undefined) {
    where.actor_type = body.actor_type;
  }
  // Compose timestamp filtering object for Prisma
  let timestampFilter: Record<string, string> = {};
  if (body.from_date !== undefined) {
    timestampFilter.gte = body.from_date;
  }
  if (body.to_date !== undefined) {
    timestampFilter.lte = body.to_date;
  }
  if (Object.keys(timestampFilter).length > 0) {
    where.timestamp = timestampFilter;
  }

  // 3. Sorting and pagination parameters
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  const orderBy = [
    {
      timestamp:
        body.sort === "desc" ? Prisma.SortOrder.desc : Prisma.SortOrder.asc,
    },
  ];

  // 4. Query status histories and total matching count
  const [allHistories, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_refund_status_histories.findMany({
      where,
      orderBy,
    }),
    MyGlobal.prisma.shopping_refund_status_histories.count({ where }),
  ]);

  // 5. Application-side filter on status_transition if specified
  const filtered =
    body.status_transition !== undefined
      ? allHistories.filter(
          (h) =>
            `${h.previous_status}_to_${h.new_status}` ===
            body.status_transition,
        )
      : allHistories;

  const paginated = filtered.slice(skip, skip + limit);

  // 6. Map to DTO
  const data: IShoppingRefundStatusHistory[] = paginated.map((h) => {
    const base: IShoppingRefundStatusHistory = {
      id: h.id,
      shopping_refund_request_id: h.shopping_refund_request_id,
      shopping_actor_id: h.shopping_actor_id,
      actor_type: typia.assert<"customer" | "seller" | "admin">(h.actor_type),
      previous_status: h.previous_status as any, // Assume enum compatibility
      new_status: h.new_status as any, // Assume enum compatibility
      timestamp: toISOStringSafe(h.timestamp) as string &
        tags.Format<"date-time">,
    };
    if (h.change_context !== undefined && h.change_context !== null) {
      return {
        ...base,
        change_context: h.change_context,
      };
    }
    return base;
  });

  // 7. Pagination result based on filtered data
  const totalRecords = filtered.length;
  const pages = Math.ceil(totalRecords / limit);
  const pagination = {
    current: page,
    limit: limit,
    records: totalRecords,
    pages: pages,
  };

  return {
    pagination,
    data,
  };
}
