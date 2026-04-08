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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCustomerSessions(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const body = props.body;
  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting parameters
  const sortBy = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  // Build where clause
  const where: Prisma.ecommerce_mall_customer_sessionsWhereInput = {};
  // Created at range filter
  if (
    (body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
  ) {
    where.created_at = {};
    if (body.createdAtFrom !== undefined && body.createdAtFrom !== null) {
      (where.created_at as any).gte = new Date(body.createdAtFrom);
    }
    if (body.createdAtTo !== undefined && body.createdAtTo !== null) {
      (where.created_at as any).lte = new Date(body.createdAtTo);
    }
  }
  // Expired at range filter and status filter
  const hasExpiredAtFrom =
    body.expiredAtFrom !== undefined && body.expiredAtFrom !== null;
  const hasExpiredAtTo =
    body.expiredAtTo !== undefined && body.expiredAtTo !== null;
  const hasStatus = body.status !== undefined && body.status !== null;
  if (hasExpiredAtFrom || hasExpiredAtTo || hasStatus) {
    where.expired_at = {};
    if (hasExpiredAtFrom) {
      (where.expired_at as any).gte = new Date(body.expiredAtFrom!);
    }
    if (hasExpiredAtTo) {
      (where.expired_at as any).lte = new Date(body.expiredAtTo!);
    }
    if (hasStatus) {
      const now = new Date();
      if (body.status === "active") {
        (where.expired_at as any).gt = now;
      } else if (body.status === "expired") {
        (where.expired_at as any).lte = now;
      }
    }
  }
  // IP partial match filter
  if (body.ip !== undefined && body.ip !== null && body.ip.length > 0) {
    where.ip = {
      contains: body.ip,
    };
  }
  // Cursor pagination (for keyset pagination based on created_at)
  if (body.cursor !== undefined && body.cursor !== null) {
    if (where.created_at === undefined) {
      where.created_at = {};
    }
    if (sortOrder === "asc") {
      (where.created_at as any).gt = new Date(body.cursor);
    } else {
      (where.created_at as any).lt = new Date(body.cursor);
    }
  }
  // Build order by
  const orderBy: Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput =
    sortBy === "expired_at"
      ? { expired_at: sortOrder }
      : { created_at: sortOrder };
  // Execute queries sequentially (not parallel) as per guidelines
  const sessions =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    sessions,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
