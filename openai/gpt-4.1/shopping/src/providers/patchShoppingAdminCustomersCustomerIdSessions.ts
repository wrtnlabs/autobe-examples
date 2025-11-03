import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerSession";
import { IPageIShoppingCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminCustomersCustomerIdSessions(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomerSession.IRequest;
}): Promise<IPageIShoppingCustomerSession> {
  // Check customer exists and is not deleted
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: props.customerId, deleted_at: null },
    select: { id: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Pagination parameters (default limit 20, page 1)
  const limit = props.body.limit !== undefined ? props.body.limit : 20;
  const page = props.body.page !== undefined ? props.body.page : 1;
  const skip = (page - 1) * limit;

  // Where clause
  const where: Record<string, unknown> = {
    shopping_customer_id: props.customerId,
    ...(props.body.status === "active" && { expired_at: null }),
    ...(props.body.status === "expired" && { NOT: { expired_at: null } }),
    ...(props.body.created_from !== undefined && {
      created_at: { gte: props.body.created_from },
    }),
    ...(props.body.created_to !== undefined && {
      created_at: { lte: props.body.created_to },
    }),
  };

  // expired_at filtering if present
  if (
    props.body.expired_from !== undefined ||
    props.body.expired_to !== undefined
  ) {
    const expiredFilter: Record<string, string> = {};
    if (props.body.expired_from !== undefined) {
      expiredFilter.gte = props.body.expired_from;
    }
    if (props.body.expired_to !== undefined) {
      expiredFilter.lte = props.body.expired_to;
    }
    where.expired_at = expiredFilter;
  }

  // Search (ip, href, referrer)
  if (props.body.search !== undefined && props.body.search.length > 0) {
    where.OR = [
      { ip: { contains: props.body.search } },
      { href: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }

  // Query
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_customer_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_customer_sessions.count({ where }),
  ]);

  // Construct DTOs
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      shopping_customer_id: session.shopping_customer_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      ...(session.expired_at !== null && session.expired_at !== undefined
        ? { expired_at: toISOStringSafe(session.expired_at) }
        : {}),
    })),
  };
}
