import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import { IPageIShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerRefunds(props: {
  customer: CustomerPayload;
  body: IShoppingRefundRequest.IRequest;
}): Promise<IPageIShoppingRefundRequest.ISummary> {
  const { customer, body } = props;
  const page =
    typeof body.page === "number" &&
    Number.isInteger(body.page) &&
    body.page > 0
      ? body.page
      : 1;
  const limit =
    typeof body.limit === "number" &&
    Number.isInteger(body.limit) &&
    body.limit > 0 &&
    body.limit <= 100
      ? body.limit
      : 20;

  const where = {
    shopping_actor_id: customer.id,
    actor_type: "customer",
    deleted_at: null,
    ...(body.request_type ? { request_type: body.request_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.actor_id ? { shopping_actor_id: body.actor_id } : {}),
    ...(body.order_id ? { shopping_order_id: body.order_id } : {}),
    ...(body.from_date || body.to_date
      ? {
          created_at: {
            ...(body.from_date ? { gte: body.from_date } : {}),
            ...(body.to_date ? { lte: body.to_date } : {}),
          },
        }
      : {}),
  };

  const allowedFields = ["created_at", "updated_at", "status", "request_type"];
  const order_by_field = allowedFields.includes(body.order_by ?? "")
    ? (body.order_by ?? "created_at")
    : "created_at";
  const order_direction = body.order_direction === "asc" ? "asc" : "desc";

  // TypeScript only allows direct literal keys, so handle each case explicitly
  let orderBy: { [key: string]: "asc" | "desc" } = {
    created_at: order_direction,
  };
  if (order_by_field === "updated_at") {
    orderBy = { updated_at: order_direction };
  } else if (order_by_field === "status") {
    orderBy = { status: order_direction };
  } else if (order_by_field === "request_type") {
    orderBy = { request_type: order_direction };
  } // else fallback to created_at

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_refund_requests.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_refund_requests.count({ where }),
  ]);

  const orderIdSet: Set<string> = new Set();
  const refundIds: Set<string> = new Set();
  const actorIdSet: Set<string> = new Set();
  rows.forEach((r) => {
    orderIdSet.add(r.shopping_order_id);
    refundIds.add(r.id);
    actorIdSet.add(r.shopping_actor_id);
  });

  const [orders, customers, items] = await Promise.all([
    MyGlobal.prisma.shopping_orders.findMany({
      where: { id: { in: Array.from(orderIdSet) } },
      select: {
        id: true,
        order_code: true,
        total_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        shopping_customer_id: true,
      },
    }),
    MyGlobal.prisma.shopping_customers.findMany({
      where: { id: { in: Array.from(actorIdSet) } },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_refund_request_items.findMany({
      where: { shopping_refund_request_id: { in: Array.from(refundIds) } },
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_order_line_id: true,
        quantity: true,
        item_business_reason: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  const orderMap: Record<string, (typeof orders)[number]> = {};
  const customerMap: Record<string, (typeof customers)[number]> = {};
  const itemsMap: Record<string, typeof items> = {};
  orders.forEach((o) => {
    orderMap[o.id] = o;
  });
  customers.forEach((c) => {
    customerMap[c.id] = c;
  });
  items.forEach((i) => {
    if (!itemsMap[i.shopping_refund_request_id])
      itemsMap[i.shopping_refund_request_id] = [];
    itemsMap[i.shopping_refund_request_id].push(i);
  });

  const data = rows.map((refund) => {
    const order = orderMap[refund.shopping_order_id];
    const actor = customerMap[refund.shopping_actor_id];
    const orderSummary: IShoppingOrder.ISummary = {
      id: order.id,
      order_code: order.order_code,
      total_price: order.total_price,
      status: order.status,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      customer: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        is_active: actor.is_active,
        created_at: toISOStringSafe(actor.created_at),
        deleted_at:
          actor.deleted_at === null ? null : toISOStringSafe(actor.deleted_at),
      },
    };
    const actorSummary: IShoppingRefundActor.ISummary = {
      actor_type: "customer",
      id: actor.id,
      name: actor.name,
    };
    const refundItems = (itemsMap[refund.id] || []).map((i) => ({
      id: i.id,
      shopping_refund_request_id: i.shopping_refund_request_id,
      order_line_id: i.shopping_order_line_id,
      quantity: i.quantity,
      item_business_reason: i.item_business_reason ?? undefined,
      created_at: toISOStringSafe(i.created_at),
      updated_at: toISOStringSafe(i.updated_at),
    }));
    return {
      id: refund.id,
      order: orderSummary,
      actor: actorSummary,
      request_type: refund.request_type,
      business_reason: refund.business_reason,
      request_context: refund.request_context ?? undefined,
      status: refund.status,
      created_at: toISOStringSafe(refund.created_at),
      updated_at: toISOStringSafe(refund.updated_at),
      items: refundItems,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
