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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomerSessions(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  const now = toISOStringSafe(new Date());

  const where: {
    deleted_at: null;
    ip?: { contains: string };
    referrer?: { contains: string };
    expired_at?:
      | { gt?: string & tags.Format<"date-time"> }
      | { lte?: string & tags.Format<"date-time"> };
  } = {
    deleted_at: null,
  };

  if (body.filter_ip !== undefined && body.filter_ip !== null) {
    where.ip = { contains: body.filter_ip };
  }

  if (body.filter_referrer !== undefined && body.filter_referrer !== null) {
    where.referrer = { contains: body.filter_referrer };
  }

  if (body.filter_valid !== undefined && body.filter_valid !== null) {
    if (body.filter_valid) {
      where.expired_at = { gt: now };
    } else {
      where.expired_at = { lte: now };
    }
  }

  const sortBy =
    body.sort_by === "created_at" || body.sort_by === "updated_at"
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.count({ where }),
  ]);

  const data: IShoppingMallCustomerSession.ISummary[] = results.map(
    (session) => ({
      id: session.id as string & tags.Format<"uuid">,
      shopping_mall_customer_id: session.shopping_mall_customer_id as string &
        tags.Format<"uuid">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    }),
  );

  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { pagination, data };
}
