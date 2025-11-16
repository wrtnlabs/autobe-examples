import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderNumberStatusHistories(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  // 1. Find the order by orderNumber
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Prepare filters
  const {
    statuses,
    actor_type,
    actor_id,
    from_time,
    to_time,
    search,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;
  const skip = ((page ?? 1) - 1) * (limit ?? 20);
  const take = limit ?? 20;
  const orderBy = ((): Record<string, unknown> => {
    if (sort_by === "status") {
      return { to_status: sort_order ?? "desc" };
    }
    return { created_at: sort_order ?? "desc" };
  })();

  // 3. Build history where clause
  const where: Record<string, unknown> = {
    shopping_mall_order_id: order.id,
    ...(statuses && statuses.length > 0 ? { to_status: { in: statuses } } : {}),
    ...(from_time ? { created_at: { gte: from_time } } : {}),
    ...(to_time
      ? {
          created_at: {
            ...(from_time ? { gte: from_time } : {}),
            lte: to_time,
          },
        }
      : {}),
    ...(search ? { comment: { contains: search } } : {}),
  };
  if (actor_type || actor_id) {
    if (actor_type === "admin")
      where.actor_admin_id = actor_id ?? { not: null };
    if (actor_type === "seller")
      where.actor_seller_id = actor_id ?? { not: null };
    if (actor_type === "customer")
      where.actor_customer_id = actor_id ?? { not: null };
    if (actor_type === "system")
      ((where.actor_admin_id = null),
        (where.actor_seller_id = null),
        (where.actor_customer_id = null));
  }

  // 4. Query status histories with pagination and actors joined
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_histories.count({ where }),
    MyGlobal.prisma.shopping_mall_order_status_histories.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        adminActor: true,
        sellerActor: true,
        customerActor: true,
      },
    }),
  ]);

  // 5. Compose pagination object and data/transform
  const data = rows.map((h) => ({
    id: h.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    },
    from_status: h.from_status,
    to_status: h.to_status,
    comment: h.comment ?? undefined,
    created_at: toISOStringSafe(h.created_at),
    admin: h.adminActor
      ? {
          id: h.adminActor.id,
          name: h.adminActor.name,
          email: h.adminActor.email,
        }
      : undefined,
    seller: h.sellerActor
      ? {
          id: h.sellerActor.id,
          business_name: h.sellerActor.business_name,
        }
      : undefined,
    customer: h.customerActor
      ? {
          id: h.customerActor.id,
          name: h.customerActor.name,
        }
      : undefined,
  }));
  return {
    pagination: {
      current: Number(page ?? 1),
      limit: Number(limit ?? 20),
      records: total,
      pages: Math.ceil(total / (limit ?? 20)),
    },
    data,
  };
}
