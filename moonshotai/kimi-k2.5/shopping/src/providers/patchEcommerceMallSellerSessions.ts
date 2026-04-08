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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSessions(props: {
  seller: SellerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build where clause based on filters
  const where: Prisma.ecommerce_mall_seller_sessionsWhereInput = {};
  // Filter by status (active/expired) - handled at DB query level
  const now = new Date();
  if (props.body.status === "active") {
    where.expired_at = { gt: now };
  } else if (props.body.status === "expired") {
    where.expired_at = { lte: now };
  }
  // Filter by date ranges
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    where.created_at = {
      ...(where.created_at as Record<string, Date> | undefined),
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    where.created_at = {
      ...(where.created_at as Record<string, Date> | undefined),
      lte: new Date(props.body.createdAtTo),
    };
  }
  if (
    props.body.expiredAtFrom !== undefined &&
    props.body.expiredAtFrom !== null
  ) {
    where.expired_at = {
      ...(where.expired_at as Record<string, Date> | undefined),
      gte: new Date(props.body.expiredAtFrom),
    };
  }
  if (props.body.expiredAtTo !== undefined && props.body.expiredAtTo !== null) {
    where.expired_at = {
      ...(where.expired_at as Record<string, Date> | undefined),
      lte: new Date(props.body.expiredAtTo),
    };
  }
  // Filter by IP (partial match)
  if (
    props.body.ip !== undefined &&
    props.body.ip !== null &&
    props.body.ip !== ""
  ) {
    where.ip = { contains: props.body.ip };
  }
  // Filter by cursor (created_at < cursor for descending sort)
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    where.created_at = {
      ...(where.created_at as Record<string, Date> | undefined),
      [sortOrder === "asc" ? "gte" : "lte"]: new Date(props.body.cursor),
    };
  }
  // Order by clause
  const orderBy: Prisma.ecommerce_mall_seller_sessionsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  // Fetch sessions and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_sessions.count({ where }),
  ]);
  // Transform to response type with proper date string conversion
  const data = sessions.map((session) => {
    const createdAtISO = session.created_at.toISOString();
    const expiredAtISO = session.expired_at.toISOString();
    const isActiveValue = session.expired_at > now;
    return {
      id: session.id as string & tags.Format<"uuid">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      createdAt: createdAtISO as string & tags.Format<"date-time">,
      expiredAt: expiredAtISO as string & tags.Format<"date-time">,
      isActive: isActiveValue,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
