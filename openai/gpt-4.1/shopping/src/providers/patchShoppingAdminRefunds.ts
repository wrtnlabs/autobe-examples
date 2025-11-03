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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminRefunds(props: {
  admin: AdminPayload;
  body: IShoppingRefundRequest.IRequest;
}): Promise<IPageIShoppingRefundRequest.ISummary> {
  const { body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build filter conditions
  const where = {
    deleted_at: null,
    ...(body.request_type !== undefined &&
      body.request_type !== null && { request_type: body.request_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.actor_type !== undefined &&
      body.actor_type !== null && { actor_type: body.actor_type }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { shopping_actor_id: body.actor_id }),
    ...(body.order_id !== undefined &&
      body.order_id !== null && { shopping_order_id: body.order_id }),
    ...(body.from_date !== undefined &&
      body.from_date !== null && {
        created_at: { gte: body.from_date },
      }),
    ...(body.to_date !== undefined &&
      body.to_date !== null && {
        created_at: {
          ...(body.from_date !== undefined &&
            body.from_date !== null && { gte: body.from_date }),
          lte: body.to_date,
        },
      }),
  };

  // Sorting
  let orderBy: any = { created_at: "desc" };
  if (body.order_by?.length) {
    orderBy = {
      [body.order_by]: body.order_direction === "asc" ? "asc" : "desc",
    };
  }

  // Fetch total count for pagination
  const total = await MyGlobal.prisma.shopping_refund_requests.count({ where });
  // Fetch refund requests with related info
  const requests = await MyGlobal.prisma.shopping_refund_requests.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    include: {
      order: {
        include: {
          customer: true,
        },
      },
      shopping_refund_request_items: true,
    },
  });

  // Build summary data
  const data = requests.map((request) => {
    // Resolve actor
    let actor: IShoppingRefundActor.ISummary;
    if (request.actor_type === "customer") {
      // Only customer supported in DB schema for actor
      actor = {
        actor_type: "customer",
        id: request.shopping_actor_id,
        name: request.order.customer.name,
      };
    } else if (
      request.actor_type === "seller" ||
      request.actor_type === "admin"
    ) {
      // If needed, could join corresponding user
      actor = {
        actor_type: request.actor_type as "seller" | "admin",
        id: request.shopping_actor_id,
        name: "", // Not available, would require join from seller/admin tables
      };
    } else {
      actor = {
        actor_type: "customer",
        id: request.shopping_actor_id,
        name: "",
      };
    }

    // Refund items summary
    const items: IShoppingRefundRequestItem.ISummary[] =
      request.shopping_refund_request_items.map((item) => ({
        id: item.id,
        shopping_refund_request_id: item.shopping_refund_request_id,
        order_line_id: item.shopping_order_line_id,
        quantity: item.quantity,
        item_business_reason: item.item_business_reason ?? null,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
      }));

    // Order summary
    const order = request.order;
    const customer = order.customer;

    const orderSummary: IShoppingOrder.ISummary = {
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
        deleted_at: customer.deleted_at
          ? toISOStringSafe(customer.deleted_at)
          : null,
      },
    };

    return {
      id: request.id,
      order: orderSummary,
      actor,
      request_type: request.request_type,
      business_reason: request.business_reason,
      request_context: request.request_context ?? null,
      status: request.status,
      created_at: toISOStringSafe(request.created_at),
      updated_at: toISOStringSafe(request.updated_at),
      items,
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
