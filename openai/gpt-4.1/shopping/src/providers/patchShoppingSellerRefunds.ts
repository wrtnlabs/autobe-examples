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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerRefunds(props: {
  seller: SellerPayload;
  body: IShoppingRefundRequest.IRequest;
}): Promise<IPageIShoppingRefundRequest.ISummary> {
  const { seller, body } = props;

  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const offset = (page - 1) * limit;

  const sellerOrderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: { shopping_seller_id: seller.id },
    select: { id: true },
  });
  const sellerOrderLineIds = sellerOrderLines.map((l) => l.id);
  if (sellerOrderLineIds.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const matchingRefundItems =
    await MyGlobal.prisma.shopping_refund_request_items.findMany({
      where: { shopping_order_line_id: { in: sellerOrderLineIds } },
      select: { shopping_refund_request_id: true },
    });
  const relevantRefundRequestIds = [
    ...new Set(matchingRefundItems.map((i) => i.shopping_refund_request_id)),
  ];
  if (relevantRefundRequestIds.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const where: Record<string, unknown> = {
    id: { in: relevantRefundRequestIds },
    deleted_at: null,
    ...(body.request_type ? { request_type: body.request_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.actor_type ? { actor_type: body.actor_type } : {}),
    ...(body.actor_id ? { shopping_actor_id: body.actor_id } : {}),
    ...(body.order_id ? { shopping_order_id: body.order_id } : {}),
    ...(body.from_date ? { created_at: { gte: body.from_date } } : {}),
    ...(body.to_date
      ? {
          created_at: {
            ...(body.from_date ? { gte: body.from_date } : {}),
            lte: body.to_date,
          },
        }
      : {}),
  };

  let orderByField = "created_at";
  if (
    body.order_by &&
    ["created_at", "updated_at", "status", "request_type"].includes(
      body.order_by,
    )
  ) {
    orderByField = body.order_by;
  }
  const orderDirection = body.order_direction === "asc" ? "asc" : "desc";

  const total = await MyGlobal.prisma.shopping_refund_requests.count({ where });

  const refundRequests =
    await MyGlobal.prisma.shopping_refund_requests.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: offset,
      take: limit,
      select: {
        id: true,
        shopping_order_id: true,
        shopping_actor_id: true,
        actor_type: true,
        request_type: true,
        business_reason: true,
        request_context: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

  const orderIds = [...new Set(refundRequests.map((r) => r.shopping_order_id))];
  const actorIdsByType: Record<string, Set<string>> = {};
  for (const r of refundRequests) {
    if (!actorIdsByType[r.actor_type]) actorIdsByType[r.actor_type] = new Set();
    actorIdsByType[r.actor_type].add(r.shopping_actor_id);
  }

  const orders = await MyGlobal.prisma.shopping_orders.findMany({
    where: { id: { in: orderIds } },
    select: {
      id: true,
      order_code: true,
      total_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      shopping_customer_id: true,
    },
  });
  const customerIds = [...new Set(orders.map((o) => o.shopping_customer_id))];
  const customers = await MyGlobal.prisma.shopping_customers.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      created_at: true,
      deleted_at: true,
    },
  });
  const sellerActorIds = actorIdsByType["seller"]
    ? Array.from(actorIdsByType["seller"])
    : [];
  const sellers = sellerActorIds.length
    ? await MyGlobal.prisma.shopping_sellers.findMany({
        where: { id: { in: sellerActorIds } },
        select: { id: true, display_name: true },
      })
    : [];
  const adminActorIds = actorIdsByType["admin"]
    ? Array.from(actorIdsByType["admin"])
    : [];
  const admins = adminActorIds.length
    ? await MyGlobal.prisma.shopping_admins.findMany({
        where: { id: { in: adminActorIds } },
        select: { id: true, name: true },
      })
    : [];

  const refundRequestIds = refundRequests.map((r) => r.id);
  const allItems = await MyGlobal.prisma.shopping_refund_request_items.findMany(
    {
      where: { shopping_refund_request_id: { in: refundRequestIds } },
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_order_line_id: true,
        quantity: true,
        item_business_reason: true,
        created_at: true,
        updated_at: true,
      },
    },
  );

  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
  const sellerMap = Object.fromEntries(sellers.map((s) => [s.id, s]));
  const adminMap = Object.fromEntries(admins.map((a) => [a.id, a]));
  const itemsByRefundRequest: Record<string, typeof allItems> = {};
  for (const item of allItems) {
    if (!itemsByRefundRequest[item.shopping_refund_request_id])
      itemsByRefundRequest[item.shopping_refund_request_id] = [];
    itemsByRefundRequest[item.shopping_refund_request_id].push(item);
  }

  const data = refundRequests
    .map((r) => {
      const order = orderMap[r.shopping_order_id];
      const customer = order
        ? customerMap[order.shopping_customer_id]
        : undefined;
      const orderSummary =
        order && customer
          ? {
              id: order.id,
              order_code: order.order_code,
              total_price: order.total_price,
              status: order.status,
              created_at: toISOStringSafe(order.created_at),
              updated_at: toISOStringSafe(order.updated_at),
              customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                is_active: customer.is_active,
                created_at: toISOStringSafe(customer.created_at),
                deleted_at:
                  customer.deleted_at !== null
                    ? toISOStringSafe(customer.deleted_at)
                    : null,
              },
            }
          : undefined;
      let actorSummary: IShoppingRefundActor.ISummary | undefined = undefined;
      if (r.actor_type === "customer" && customerMap[r.shopping_actor_id]) {
        const ac = customerMap[r.shopping_actor_id];
        actorSummary = { actor_type: "customer", id: ac.id, name: ac.name };
      } else if (r.actor_type === "seller" && sellerMap[r.shopping_actor_id]) {
        const ac = sellerMap[r.shopping_actor_id];
        actorSummary = {
          actor_type: "seller",
          id: ac.id,
          name: ac.display_name,
        };
      } else if (r.actor_type === "admin" && adminMap[r.shopping_actor_id]) {
        const ac = adminMap[r.shopping_actor_id];
        actorSummary = { actor_type: "admin", id: ac.id, name: ac.name };
      }
      const itemSummaries = (itemsByRefundRequest[r.id] ?? []).map((item) => ({
        id: item.id,
        shopping_refund_request_id: item.shopping_refund_request_id,
        order_line_id: item.shopping_order_line_id,
        quantity: item.quantity,
        item_business_reason: item.item_business_reason ?? undefined,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
      }));
      if (!orderSummary || !actorSummary) return undefined;
      return {
        id: r.id,
        order: orderSummary,
        actor: actorSummary,
        request_type: r.request_type,
        business_reason: r.business_reason,
        request_context: r.request_context ?? undefined,
        status: r.status,
        created_at: toISOStringSafe(r.created_at),
        updated_at: toISOStringSafe(r.updated_at),
        items: itemSummaries,
      };
    })
    .filter(Boolean) as IShoppingRefundRequest.ISummary[];

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
