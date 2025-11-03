import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellerSessions(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  const {
    shopping_mall_seller_id,
    ip,
    href,
    referrer,
    created_at_gte,
    created_at_lte,
    expired_at_gte,
    expired_at_lte,
    page = 1,
    limit = 10,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  const where = {
    deleted_at: null,
    ...(shopping_mall_seller_id !== undefined &&
      shopping_mall_seller_id !== null && {
        shopping_mall_seller_id: shopping_mall_seller_id,
      }),
    ...(ip !== undefined && ip !== null && { ip }),
    ...(href !== undefined && href !== null && { href }),
    ...(referrer !== undefined && referrer !== null && { referrer }),
    ...((created_at_gte !== undefined || created_at_lte !== undefined) && {
      created_at: {
        ...(created_at_gte !== undefined && { gte: created_at_gte }),
        ...(created_at_lte !== undefined && { lte: created_at_lte }),
      },
    }),
    ...((expired_at_gte !== undefined || expired_at_lte !== undefined) && {
      expired_at: {
        ...(expired_at_gte !== undefined && { gte: expired_at_gte }),
        ...(expired_at_lte !== undefined && { lte: expired_at_lte }),
      },
    }),
  };

  const orderBy =
    sort_order === "asc" ? { [sort_by]: "asc" } : { [sort_by]: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_seller_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results.map((record) => ({
      id: record.id,
      shopping_mall_seller_id: record.shopping_mall_seller_id,
      ip: record.ip,
      href: record.href,
      referrer: record.referrer,
      created_at: toISOStringSafe(record.created_at),
      expired_at:
        record.expired_at !== null && record.expired_at !== undefined
          ? toISOStringSafe(record.expired_at)
          : null,
    })),
  };
}
