import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.shopping_mall_customer_id !== undefined &&
      body.shopping_mall_customer_id !== null && {
        shopping_mall_customer_id: body.shopping_mall_customer_id,
      }),
    ...(body.shopping_mall_seller_id !== undefined &&
      body.shopping_mall_seller_id !== null && {
        shopping_mall_seller_id: body.shopping_mall_seller_id,
      }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.business_status !== undefined && {
      business_status: body.business_status,
    }),
    ...(body.payment_method !== undefined && {
      payment_method: body.payment_method,
    }),
    ...(body.order_number !== undefined && {
      order_number: body.order_number,
    }),
    ...(body.search !== undefined && {
      OR: [
        { order_number: { contains: body.search } },
        { shipping_address: { contains: body.search } },
      ],
    }),
    ...((body.from_created_at !== undefined ||
      body.to_created_at !== undefined) && {
      created_at: {
        ...(body.from_created_at !== undefined
          ? { gte: body.from_created_at }
          : {}),
        ...(body.to_created_at !== undefined
          ? { lte: body.to_created_at }
          : {}),
      },
    }),
    ...((body.from_updated_at !== undefined ||
      body.to_updated_at !== undefined) && {
      updated_at: {
        ...(body.from_updated_at !== undefined
          ? { gte: body.from_updated_at }
          : {}),
        ...(body.to_updated_at !== undefined
          ? { lte: body.to_updated_at }
          : {}),
      },
    }),
  } as const;

  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        business_status: true,
        payment_method: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: orders.map((order) => ({
      id: order.id as string & tags.Format<"uuid">,
      order_number: order.order_number,
      total_price: order.total_price,
      status: order.status,
      business_status: order.business_status,
      payment_method: order.payment_method,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
    })),
  };
}
