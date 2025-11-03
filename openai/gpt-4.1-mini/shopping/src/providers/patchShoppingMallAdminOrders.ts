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
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    order_code?: string;
    status?: string;
    payment_status?: string;
    total_amount?: {
      gte?: number;
      lte?: number;
    };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    customer?: {
      email?: string;
    };
  } = {
    deleted_at: null,
  };

  if (body.order_code !== undefined) where.order_code = body.order_code;
  if (body.status !== undefined) where.status = body.status;
  if (body.payment_status !== undefined)
    where.payment_status = body.payment_status;

  if (
    body.total_amount_min !== undefined ||
    body.total_amount_max !== undefined
  ) {
    where.total_amount = {};
    if (body.total_amount_min !== undefined)
      where.total_amount.gte = body.total_amount_min;
    if (body.total_amount_max !== undefined)
      where.total_amount.lte = body.total_amount_max;
  }

  if (body.created_from !== undefined || body.created_to !== undefined) {
    where.created_at = {};
    if (body.created_from !== undefined)
      where.created_at.gte = body.created_from;
    if (body.created_to !== undefined) where.created_at.lte = body.created_to;
  }

  if (body.customer_email !== undefined) {
    where.customer = { email: body.customer_email };
  }

  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            nickname: true,
            created_at: true,
          },
        },
        shopping_mall_order_items: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: orders.map((order) => ({
      id: order.id as string & tags.Format<"uuid">,
      order_code: order.order_code,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      shipping_address: order.shipping_address,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      customer: {
        id: order.customer.id as string & tags.Format<"uuid">,
        email: order.customer.email,
        nickname: order.customer.nickname,
        created_at: toISOStringSafe(order.customer.created_at),
      },
      order_items_count: order.shopping_mall_order_items.length,
      comments: null,
    })),
  };
}
