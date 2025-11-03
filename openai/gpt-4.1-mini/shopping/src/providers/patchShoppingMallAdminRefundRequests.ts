import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const { admin, body } = props;

  // Normalize pagination parameters
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;
  const page = pageRaw < 1 ? 1 : pageRaw;
  const limit = limitRaw < 1 ? 10 : limitRaw > 100 ? 100 : limitRaw;

  // Build where condition for refund requests
  const whereConditions: Prisma.shopping_mall_refund_requestsWhereInput = {
    ...(body.refund_status !== undefined && {
      refund_status: body.refund_status,
    }),
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_customer_id: body.customer_id,
      }),
  };

  // Filter orders by order_code if provided
  const orderWhere: Prisma.shopping_mall_ordersWhereInput | undefined =
    body.order_code
      ? {
          order_code: {
            contains: body.order_code,
          },
        }
      : undefined;

  // Validate sorting parameters
  const allowedSortFields = ["created_at", "updated_at", "refund_amount"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const orderDirection =
    body.order_direction === "asc" || body.order_direction === "desc"
      ? body.order_direction
      : "desc";

  // Fetch paginated data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        ...whereConditions,
        ...(orderWhere ? { shopping_mall_order: orderWhere } : {}),
      },
      orderBy: {
        [sortBy]: orderDirection,
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_customer_id: true,
        refund_amount: true,
        refund_reason: true,
        refund_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        ...whereConditions,
        ...(orderWhere ? { shopping_mall_order: orderWhere } : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      shopping_mall_order_id: r.shopping_mall_order_id,
      shopping_mall_customer_id: r.shopping_mall_customer_id,
      refund_amount: r.refund_amount,
      refund_reason: r.refund_reason ?? null,
      refund_status: r.refund_status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
