import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdCancellationRequests(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const { orderId, body } = props;

  const page = body.page !== undefined && body.page !== null ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_order_id: orderId,
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...(body.fromDate !== undefined && body.fromDate !== null
      ? { requested_at: { gte: body.fromDate } }
      : {}),
    ...(body.toDate !== undefined && body.toDate !== null
      ? {
          requested_at: {
            ...(body.fromDate !== undefined && body.fromDate !== null
              ? { gte: body.fromDate }
              : {}),
            lte: body.toDate,
          },
        }
      : {}),
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? { reason: { contains: body.search } }
      : {}),
  };

  const allowedOrderColumns = new Set([
    "id",
    "shopping_mall_order_id",
    "shopping_mall_customer_id",
    "reason",
    "status",
    "requested_at",
    "processed_at",
  ]);

  const orderByColumn =
    body.orderByColumn && allowedOrderColumns.has(body.orderByColumn)
      ? body.orderByColumn
      : "requested_at";
  const orderByDirection = body.orderBy === "asc" ? "asc" : "desc";

  const orderBy = { [orderByColumn]: orderByDirection };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_customer_id: true,
        reason: true,
        status: true,
        requested_at: true,
        processed_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((it) => ({
      id: it.id,
      shopping_mall_order_id: it.shopping_mall_order_id,
      shopping_mall_customer_id: it.shopping_mall_customer_id,
      reason: it.reason,
      status: it.status,
      requested_at: toISOStringSafe(it.requested_at),
      processed_at: it.processed_at ? toISOStringSafe(it.processed_at) : null,
    })),
  };
}
