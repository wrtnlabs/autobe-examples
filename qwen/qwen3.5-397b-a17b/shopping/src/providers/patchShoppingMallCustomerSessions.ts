import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput: Prisma.shopping_mall_customer_sessionsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.search && {
      ip: { contains: props.body.search },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  };
  const [allSessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.count({
      where: whereInput,
    }),
  ]);
  const filteredSessions = props.body.status
    ? allSessions.filter((session) => {
        const isActive = session.expired_at > now;
        return props.body.status === "active" ? isActive : !isActive;
      })
    : allSessions;
  const paginatedData = filteredSessions.slice(skip, skip + limit);
  const filteredTotal = filteredSessions.length;
  return {
    data: paginatedData.map((session) => {
      const isActive = session.expired_at > now;
      const isCurrent = session.id === props.customer.session_id;
      return {
        id: session.id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: toISOStringSafe(session.created_at),
        expired_at: toISOStringSafe(session.expired_at),
        is_active: isActive,
        is_current: isCurrent,
      } satisfies IShoppingMallCustomerSession.ISummary;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: filteredTotal,
      pages: Math.ceil(filteredTotal / limit),
    } satisfies IPage.IPagination,
  };
}
