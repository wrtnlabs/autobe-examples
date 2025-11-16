import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomersCustomerIdSessions(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession> {
  // 1. Check customer existence
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // 2. Build Prisma query for session filtering
  const {
    page = 1,
    limit = 100,
    search,
    order_by,
    order,
    filter_from,
    filter_to,
    filter_ip,
  } = props.body || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    shopping_mall_customer_id: props.customerId,
    ...(filter_ip && { ip: filter_ip }),
    ...(filter_from || filter_to
      ? {
          created_at: {
            ...(filter_from && { gte: filter_from }),
            ...(filter_to && { lte: filter_to }),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { ip: { contains: search } },
            { href: { contains: search } },
            { referrer: { contains: search } },
          ],
        }
      : {}),
  };

  // 3. Ordering
  const allowedOrderFields = ["created_at", "expired_at", "ip"];
  let orderBy: any = undefined;
  if (order_by && allowedOrderFields.includes(order_by)) {
    orderBy = { [order_by]: order === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }

  // 4. Query data and count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.count({ where }),
  ]);

  // 5. Map to API DTO shape, transform date fields
  const data = sessions.map((session) => ({
    id: session.id,
    customer: { id: customer.id, name: customer.name },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
