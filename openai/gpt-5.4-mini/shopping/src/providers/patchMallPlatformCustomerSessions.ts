import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
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

export async function patchMallPlatformCustomerSessions(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerSession.IRequest;
}): Promise<IPageIMallPlatformCustomerSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const createdAtFilters: Prisma.DateTimeFilter = {
    ...(props.body.createdAtFrom !== undefined && {
      gte: props.body.createdAtFrom,
    }),
    ...(props.body.createdAtTo !== undefined && {
      lte: props.body.createdAtTo,
    }),
  };
  const expiredAtFilters: Prisma.DateTimeFilter = {
    ...(props.body.expiredAtFrom !== undefined && {
      gte: props.body.expiredAtFrom,
    }),
    ...(props.body.expiredAtTo !== undefined && {
      lte: props.body.expiredAtTo,
    }),
  };
  const customerScope: string & tags.Format<"uuid"> = props.customer.id;
  const requestedCustomerId: (string & tags.Format<"uuid">) | undefined =
    props.body.mallPlatformCustomerId;
  if (
    requestedCustomerId !== undefined &&
    requestedCustomerId !== customerScope
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.mall_platform_customer_sessionsWhereInput = {
    mall_platform_customer_id: customerScope,
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.href !== undefined && { href: props.body.href }),
    ...(props.body.referrer !== undefined && { referrer: props.body.referrer }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? { created_at: createdAtFilters }
      : {}),
    ...(props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
      ? { expired_at: expiredAtFilters }
      : {}),
  };
  const skip: number = (page - 1) * limit;
  const data = await MyGlobal.prisma.mall_platform_customer_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      customer: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });
  const records: number =
    await MyGlobal.prisma.mall_platform_customer_sessions.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (row) => ({
      id: row.id,
      customer: {
        id: row.customer.id,
        email: row.customer.email,
        status: row.customer.status,
        created_at: toISOStringSafe(row.customer.created_at),
        updated_at: toISOStringSafe(row.customer.updated_at),
        deleted_at:
          row.customer.deleted_at === null
            ? null
            : toISOStringSafe(row.customer.deleted_at),
      } satisfies IMallPlatformCustomer.ISummary,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      createdAt: toISOStringSafe(row.created_at),
      expiredAt: toISOStringSafe(row.expired_at),
    })),
  };
}
