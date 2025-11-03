import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { IPageIShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrderHistories(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderHistory.IRequest;
}): Promise<IPageIShoppingMallOrderHistory.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    deleted_at: null,
    ...(body.order_status !== undefined &&
      body.order_status !== null && {
        order_status: { contains: body.order_status },
      }),
    ...(body.payment_status !== undefined &&
      body.payment_status !== null && {
        payment_status: { contains: body.payment_status },
      }),
    ...(body.shipment_status !== undefined &&
      body.shipment_status !== null && {
        shipment_status: { contains: body.shipment_status },
      }),
    ...(body.date_from !== undefined &&
    body.date_from !== null &&
    body.date_to !== undefined &&
    body.date_to !== null
      ? {
          created_at: {
            gte: body.date_from,
            lte: body.date_to,
          },
        }
      : {}),
  };

  if (body.search !== undefined && body.search !== null) {
    // Add OR filter on order_status, payment_status, shipment_status
    where.OR = [
      { order_status: { contains: body.search } },
      { payment_status: { contains: body.search } },
      { shipment_status: { contains: body.search } },
    ];
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_histories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_histories.count({ where }),
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
      order_status: r.order_status,
      payment_status: r.payment_status,
      shipment_status: r.shipment_status,
      total_amount: r.total_amount,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
