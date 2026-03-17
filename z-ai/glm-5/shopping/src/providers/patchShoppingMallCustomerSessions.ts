import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
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
  const actorType = props.body.actor_type;
  const userId = props.body.user_id;
  const ipPattern = props.body.ip;
  const hrefPattern = props.body.href;
  const referrerPattern = props.body.referrer;
  const createdAtStart = props.body.created_at_start;
  const createdAtEnd = props.body.created_at_end;
  const expiredAtStart = props.body.expired_at_start;
  const expiredAtEnd = props.body.expired_at_end;
  const buildDateFilter = (
    start: string | null | undefined,
    end: string | null | undefined,
  ):
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined => {
    const filter: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (start !== null && start !== undefined) filter.gte = new Date(start);
    if (end !== null && end !== undefined) filter.lte = new Date(end);
    return Object.keys(filter).length > 0 ? filter : undefined;
  };
  const buildCustomerWhere =
    (): Prisma.shopping_mall_customer_sessionsWhereInput => {
      const where: Prisma.shopping_mall_customer_sessionsWhereInput = {};
      if (userId !== null && userId !== undefined) where.customer_id = userId;
      if (ipPattern !== null && ipPattern !== undefined)
        where.ip = { contains: ipPattern };
      if (hrefPattern !== null && hrefPattern !== undefined)
        where.href = { contains: hrefPattern };
      if (referrerPattern !== null && referrerPattern !== undefined)
        where.referrer = { contains: referrerPattern };
      const createdAtFilter = buildDateFilter(createdAtStart, createdAtEnd);
      if (createdAtFilter) where.created_at = createdAtFilter;
      const expiredAtFilter = buildDateFilter(expiredAtStart, expiredAtEnd);
      if (expiredAtFilter) where.expired_at = expiredAtFilter;
      return where;
    };
  const buildSellerWhere =
    (): Prisma.shopping_mall_seller_sessionsWhereInput => {
      const where: Prisma.shopping_mall_seller_sessionsWhereInput = {};
      if (userId !== null && userId !== undefined) where.seller_id = userId;
      if (ipPattern !== null && ipPattern !== undefined)
        where.ip = { contains: ipPattern };
      if (hrefPattern !== null && hrefPattern !== undefined)
        where.href = { contains: hrefPattern };
      if (referrerPattern !== null && referrerPattern !== undefined)
        where.referrer = { contains: referrerPattern };
      const createdAtFilter = buildDateFilter(createdAtStart, createdAtEnd);
      if (createdAtFilter) where.created_at = createdAtFilter;
      const expiredAtFilter = buildDateFilter(expiredAtStart, expiredAtEnd);
      if (expiredAtFilter) where.expired_at = expiredAtFilter;
      return where;
    };
  const buildAdministratorWhere =
    (): Prisma.shopping_mall_administrator_sessionsWhereInput => {
      const where: Prisma.shopping_mall_administrator_sessionsWhereInput = {};
      if (userId !== null && userId !== undefined)
        where.administrator_id = userId;
      if (ipPattern !== null && ipPattern !== undefined)
        where.ip = { contains: ipPattern };
      if (hrefPattern !== null && hrefPattern !== undefined)
        where.href = { contains: hrefPattern };
      if (referrerPattern !== null && referrerPattern !== undefined)
        where.referrer = { contains: referrerPattern };
      const createdAtFilter = buildDateFilter(createdAtStart, createdAtEnd);
      if (createdAtFilter) where.created_at = createdAtFilter;
      const expiredAtFilter = buildDateFilter(expiredAtStart, expiredAtEnd);
      if (expiredAtFilter) where.expired_at = expiredAtFilter;
      return where;
    };
  const transformCustomerSession = (session: {
    id: string;
    ip: string | null;
    href: string | null;
    referrer: string | null;
    created_at: Date;
    expired_at: Date;
    customer: {
      id: string;
      email: string;
      display_name: string | null;
    };
  }): IShoppingMallCustomerSession.ISummary => ({
    id: session.id as string & tags.Format<"uuid">,
    actor: {
      type: "customer",
      id: session.customer.id as string & tags.Format<"uuid">,
      email: session.customer.email as string & tags.Format<"email">,
      displayName: session.customer.display_name,
    } satisfies IShoppingMallActor.ISummary,
    actor_type: "customer",
    ip: session.ip as (string & tags.Format<"ipv4">) | null,
    href: session.href as (string & tags.Format<"url">) | null,
    referrer: session.referrer as (string & tags.Format<"uri">) | null,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    is_expired: session.expired_at < now,
    is_active: session.expired_at >= now,
  });
  const transformSellerSession = (session: {
    id: string;
    ip: string;
    href: string;
    referrer: string | null;
    created_at: Date;
    expired_at: Date;
    seller: {
      id: string;
      email: string;
      shop_name: string;
    };
  }): IShoppingMallCustomerSession.ISummary => ({
    id: session.id as string & tags.Format<"uuid">,
    actor: {
      type: "seller",
      id: session.seller.id as string & tags.Format<"uuid">,
      email: session.seller.email as string & tags.Format<"email">,
      shopName: session.seller.shop_name,
    } satisfies IShoppingMallActor.ISummary,
    actor_type: "seller",
    ip: session.ip as string & tags.Format<"ipv4">,
    href: session.href as string & tags.Format<"url">,
    referrer: session.referrer as (string & tags.Format<"uri">) | null,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    is_expired: session.expired_at < now,
    is_active: session.expired_at >= now,
  });
  const transformAdministratorSession = (session: {
    id: string;
    ip: string;
    href: string;
    referrer: string | null;
    created_at: Date;
    expired_at: Date;
    administrator: {
      id: string;
      email: string;
      grade: string;
    };
  }): IShoppingMallCustomerSession.ISummary => ({
    id: session.id as string & tags.Format<"uuid">,
    actor: {
      type: "administrator",
      id: session.administrator.id as string & tags.Format<"uuid">,
      email: session.administrator.email as string & tags.Format<"email">,
      grade: session.administrator.grade as "regular" | "super",
    } satisfies IShoppingMallActor.ISummary,
    actor_type: "administrator",
    ip: session.ip as string & tags.Format<"ipv4">,
    href: session.href as string & tags.Format<"url">,
    referrer: session.referrer as (string & tags.Format<"uri">) | null,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    is_expired: session.expired_at < now,
    is_active: session.expired_at >= now,
  });
  if (actorType === "customer") {
    const [sessions, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
        where: buildCustomerWhere(),
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          customer: {
            select: { id: true, email: true, display_name: true },
          },
        },
      }),
      MyGlobal.prisma.shopping_mall_customer_sessions.count({
        where: buildCustomerWhere(),
      }),
    ]);
    return {
      data: sessions.map(transformCustomerSession),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    } satisfies IPageIShoppingMallCustomerSession.ISummary;
  }
  if (actorType === "seller") {
    const [sessions, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
        where: buildSellerWhere(),
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          seller: {
            select: { id: true, email: true, shop_name: true },
          },
        },
      }),
      MyGlobal.prisma.shopping_mall_seller_sessions.count({
        where: buildSellerWhere(),
      }),
    ]);
    return {
      data: sessions.map(transformSellerSession),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    } satisfies IPageIShoppingMallCustomerSession.ISummary;
  }
  if (actorType === "administrator") {
    const [sessions, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_administrator_sessions.findMany({
        where: buildAdministratorWhere(),
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          administrator: {
            select: { id: true, email: true, grade: true },
          },
        },
      }),
      MyGlobal.prisma.shopping_mall_administrator_sessions.count({
        where: buildAdministratorWhere(),
      }),
    ]);
    return {
      data: sessions.map(transformAdministratorSession),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    } satisfies IPageIShoppingMallCustomerSession.ISummary;
  }
  // Query all tables when actor_type is not specified
  const [customerSessions, sellerSessions, administratorSessions] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
        where: buildCustomerWhere(),
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          customer: {
            select: { id: true, email: true, display_name: true },
          },
        },
      }),
      MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
        where: buildSellerWhere(),
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          seller: {
            select: { id: true, email: true, shop_name: true },
          },
        },
      }),
      MyGlobal.prisma.shopping_mall_administrator_sessions.findMany({
        where: buildAdministratorWhere(),
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          administrator: {
            select: { id: true, email: true, grade: true },
          },
        },
      }),
    ]);
  const allSessions: IShoppingMallCustomerSession.ISummary[] = [
    ...customerSessions.map(transformCustomerSession),
    ...sellerSessions.map(transformSellerSession),
    ...administratorSessions.map(transformAdministratorSession),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const total = allSessions.length;
  const paginatedData = allSessions.slice(skip, skip + limit);
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallCustomerSession.ISummary;
}
