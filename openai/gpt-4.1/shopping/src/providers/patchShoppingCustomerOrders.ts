import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IPageIShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingOrder.IRequest;
}): Promise<IPageIShoppingOrder.ISummary> {
  const { customer, body } = props;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Construct base where clause
  const where: {
    shopping_customer_id: string;
    deleted_at: null;
    status?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    OR?: Array<
      { order_code?: { contains: string } } | { id?: { in: string[] } }
    >;
  } = {
    shopping_customer_id: customer.id,
    deleted_at: null,
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.from_date !== undefined || body.to_date !== undefined
      ? {
          created_at: {
            ...(body.from_date !== undefined ? { gte: body.from_date } : {}),
            ...(body.to_date !== undefined ? { lte: body.to_date } : {}),
          },
        }
      : {}),
  };

  // Search functionality: match order_code or product name
  if (body.search !== undefined && body.search.length > 0) {
    // First, find all order_ids with product name containing search
    const matchedLines = await MyGlobal.prisma.shopping_order_lines.findMany({
      where: {
        order: {
          shopping_customer_id: customer.id,
          deleted_at: null,
        },
        sku: {
          product: {
            name: { contains: body.search },
          },
        },
      },
      select: { shopping_order_id: true },
    });
    const ids = Array.from(
      new Set(matchedLines.map((l) => l.shopping_order_id)),
    );
    where.OR = [
      { order_code: { contains: body.search } },
      ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
    ];
  }

  // Determine sort order
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort_by !== undefined) {
    orderBy = { [body.sort_by]: body.sort_order ?? "desc" };
  } else if (body.sort_order !== undefined) {
    orderBy = { created_at: body.sort_order };
  }

  // Get total count
  const total = await MyGlobal.prisma.shopping_orders.count({ where });

  // Get paginated orders
  const orders = await MyGlobal.prisma.shopping_orders.findMany({
    where,
    orderBy,
    skip,
    take: limit,
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

  // Fetch necessary customers (should just be the current)
  let customerSummary: IShoppingCustomer.ISummary | undefined = undefined;
  if (orders.length > 0) {
    const c = await MyGlobal.prisma.shopping_customers.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        deleted_at: true,
      },
    });
    if (c) {
      customerSummary = {
        id: c.id,
        name: c.name,
        email: c.email,
        is_active: c.is_active,
        created_at: toISOStringSafe(c.created_at),
        deleted_at:
          c.deleted_at !== null ? toISOStringSafe(c.deleted_at) : null,
      };
    }
  }

  const data: IShoppingOrder.ISummary[] = orders.map((order) => ({
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer:
      customerSummary !== undefined
        ? customerSummary
        : {
            id: customer.id,
            name: "",
            email: "",
            is_active: false,
            created_at: "1970-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
            deleted_at: null,
          },
  }));

  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
