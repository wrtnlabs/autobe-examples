import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
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

export async function patchEcommerceMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const baseWhere = {
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.createdAfter && {
      created_at: { gte: new Date(props.body.createdAfter as string) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lte: new Date(props.body.createdBefore as string) },
    }),
    ...(props.body.status === "active" && { expired_at: { gt: new Date() } }),
    ...(props.body.status === "expired" && { expired_at: { lte: new Date() } }),
  };
  const actorType = props.body.actorType;
  const queryCustomerSessions = async () => {
    const result =
      await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
        where: baseWhere,
        skip: actorType ? skip : 0,
        take: actorType ? limit : 10000,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          updated_at: true,
          expired_at: true,
        },
      });
    return result.map((r) => ({
      id: r.id,
      actor_id: r.ecommerce_mall_customer_id,
      actor_type: "customer" as const,
      ip: r.ip,
      href: r.href,
      referrer: r.referrer,
      created_at: r.created_at,
      updated_at: r.updated_at,
      expired_at: r.expired_at,
    }));
  };
  const querySellerSessions = async () => {
    const result =
      await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
        where: baseWhere,
        skip: actorType ? skip : 0,
        take: actorType ? limit : 10000,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ecommerce_mall_seller_id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      });
    return result.map((r) => ({
      id: r.id,
      actor_id: r.ecommerce_mall_seller_id,
      actor_type: "seller" as const,
      ip: r.ip,
      href: r.href,
      referrer: r.referrer,
      created_at: r.created_at,
      updated_at: null,
      expired_at: r.expired_at,
    }));
  };
  const queryAdminSessions = async () => {
    const result = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findMany(
      {
        where: baseWhere,
        skip: actorType ? skip : 0,
        take: actorType ? limit : 10000,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ecommerce_mall_admin_id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    );
    return result.map((r) => ({
      id: r.id,
      actor_id: r.ecommerce_mall_admin_id,
      actor_type: "admin" as const,
      ip: r.ip,
      href: r.href,
      referrer: r.referrer,
      created_at: r.created_at,
      updated_at: null,
      expired_at: r.expired_at,
    }));
  };
  const querySuperAdminSessions = async () => {
    const result =
      await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findMany({
        where: baseWhere,
        skip: actorType ? skip : 0,
        take: actorType ? limit : 10000,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ecommerce_mall_super_admin_id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      });
    return result.map((r) => ({
      id: r.id,
      actor_id: r.ecommerce_mall_super_admin_id,
      actor_type: "super_admin" as const,
      ip: r.ip,
      href: r.href,
      referrer: r.referrer,
      created_at: r.created_at,
      updated_at: null,
      expired_at: r.expired_at,
    }));
  };
  const queryGuestSessions = async () => {
    const result = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany(
      {
        where: baseWhere,
        skip: actorType ? skip : 0,
        take: actorType ? limit : 10000,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          ecommerce_mall_guest_id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    );
    return result.map((r) => ({
      id: r.id,
      actor_id: r.ecommerce_mall_guest_id,
      actor_type: "guest" as const,
      ip: r.ip,
      href: r.href,
      referrer: r.referrer,
      created_at: r.created_at,
      updated_at: null,
      expired_at: r.expired_at,
    }));
  };
  const countCustomer = MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where: baseWhere,
  });
  const countSeller = MyGlobal.prisma.ecommerce_mall_seller_sessions.count({
    where: baseWhere,
  });
  const countAdmin = MyGlobal.prisma.ecommerce_mall_admin_sessions.count({
    where: baseWhere,
  });
  const countSuperAdmin =
    MyGlobal.prisma.ecommerce_mall_super_admin_sessions.count({
      where: baseWhere,
    });
  const countGuest = MyGlobal.prisma.ecommerce_mall_guest_sessions.count({
    where: baseWhere,
  });
  let data: Array<{
    id: string;
    ip: string;
    href: string;
    referrer: string;
    created_at: Date;
    updated_at: Date | null;
    expired_at: Date;
  }>;
  let total: number;
  if (actorType === "customer") {
    data = await queryCustomerSessions();
    total = await countCustomer;
  } else if (actorType === "seller") {
    data = await querySellerSessions();
    total = await countSeller;
  } else if (actorType === "admin") {
    data = await queryAdminSessions();
    total = await countAdmin;
  } else if (actorType === "super_admin") {
    data = await querySuperAdminSessions();
    total = await countSuperAdmin;
  } else if (actorType === "guest") {
    data = await queryGuestSessions();
    total = await countGuest;
  } else {
    const [customers, sellers, admins, superAdmins, guests] = await Promise.all(
      [
        queryCustomerSessions(),
        querySellerSessions(),
        queryAdminSessions(),
        querySuperAdminSessions(),
        queryGuestSessions(),
      ],
    );
    const combined = [
      ...customers,
      ...sellers,
      ...admins,
      ...superAdmins,
      ...guests,
    ];
    combined.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    data = combined.slice(skip, skip + limit);
    const counts = await Promise.all([
      countCustomer,
      countSeller,
      countAdmin,
      countSuperAdmin,
      countGuest,
    ]);
    total = counts.reduce((sum, c) => sum + c, 0);
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      updated_at: toISOStringSafe(session.updated_at ?? session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
    })),
  };
}
