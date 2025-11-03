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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerCustomersCustomerIdSessions(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomerSession.IRequest;
}): Promise<IPageIShoppingCustomerSession> {
  const { customer, customerId, body } = props;
  // Authorization: Only the owner may retrieve their own session list
  if (customer.id !== customerId) {
    throw new HttpException(
      "Forbidden: you may only view your own sessions",
      403,
    );
  }
  // Pagination parameters
  const page = body.page && body.page >= 1 ? Number(body.page) : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100
      ? Number(body.limit)
      : 20;
  const skip = (page - 1) * limit;
  // Filter construction
  const where: Record<string, any> = { shopping_customer_id: customerId };
  if (body.status === "active") {
    where.expired_at = null;
  } else if (body.status === "expired") {
    where.NOT = { expired_at: null };
  }
  if (body.created_from || body.created_to) {
    where.created_at = {};
    if (body.created_from) where.created_at.gte = body.created_from;
    if (body.created_to) where.created_at.lte = body.created_to;
  }
  // Only apply expired_at range if looking for expired sessions
  if (body.status !== "active" && (body.expired_from || body.expired_to)) {
    where.expired_at = where.expired_at || {};
    if (body.expired_from) where.expired_at.gte = body.expired_from;
    if (body.expired_to) where.expired_at.lte = body.expired_to;
  }
  // Search on ip, href, referrer
  if (body.search) {
    where.OR = [
      { ip: { contains: body.search } },
      { href: { contains: body.search } },
      { referrer: { contains: body.search } },
    ];
  }
  const total = await MyGlobal.prisma.shopping_customer_sessions.count({
    where,
  });
  const sessions = await MyGlobal.prisma.shopping_customer_sessions.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const data: IShoppingCustomerSession[] = sessions.map((session) => ({
    id: session.id,
    shopping_customer_id: session.shopping_customer_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  }));
  const pages = limit > 0 ? Math.ceil(total / limit) : 1;
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
