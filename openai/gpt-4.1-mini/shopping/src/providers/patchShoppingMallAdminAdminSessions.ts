import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminSessions(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const { admin, body } = props;

  const where: Prisma.shopping_mall_admin_sessionsWhereInput = {
    ...(body.shopping_mall_admin_id !== undefined &&
      body.shopping_mall_admin_id !== null && {
        shopping_mall_admin_id: body.shopping_mall_admin_id,
      }),
    ...(body.ip !== undefined && body.ip !== null && { ip: body.ip }),
    ...(body.href !== undefined && body.href !== null && { href: body.href }),
    ...(body.referrer !== undefined &&
      body.referrer !== null && { referrer: body.referrer }),
    ...((body.created_at_from !== undefined ||
      body.created_at_to !== undefined) && {
      created_at: {
        ...(body.created_at_from !== undefined && {
          gte: body.created_at_from,
        }),
        ...(body.created_at_to !== undefined && { lte: body.created_at_to }),
      },
    }),
    ...(body.expired === true && { expired_at: { not: null } }),
    ...(body.expired === false && { expired_at: null }),
  };

  const limit = body.limit ?? 20;
  const offset = body.offset ?? 0;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admin_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(offset),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((s) => ({
      id: s.id,
      shopping_mall_admin_id: s.shopping_mall_admin_id,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at),
      expired_at: s.expired_at ? toISOStringSafe(s.expired_at) : null,
    })),
  };
}
