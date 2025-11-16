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

export async function patchShoppingMallAdminSellersSellerIdSessions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const filters: Record<string, any> = {
    shopping_mall_seller_id: props.sellerId,
    ...(props.body.ip !== undefined &&
      props.body.ip !== null && {
        ip: { contains: props.body.ip, mode: "insensitive" },
      }),
    ...(props.body.start_at !== undefined &&
      props.body.start_at !== null && {
        created_at: Object.assign(
          {},
          props.body.start_at ? { gte: props.body.start_at } : {},
          props.body.end_at ? { lt: props.body.end_at } : {},
        ),
      }),
    ...(props.body.end_at !== undefined &&
      props.body.end_at !== null &&
      (!props.body.start_at
        ? {
            created_at: { lt: props.body.end_at },
          }
        : {})),
    ...(props.body.expired === true && {
      expired_at: { not: null },
    }),
    ...(props.body.expired === false && {
      expired_at: null,
    }),
  };

  // Count and fetch concurrently
  const [total, items] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.count({ where: filters }),
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((row) => ({
      id: row.id,
      shopping_mall_seller_id: row.shopping_mall_seller_id,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: toISOStringSafe(row.created_at),
      expired_at:
        row.expired_at !== null && row.expired_at !== undefined
          ? toISOStringSafe(row.expired_at)
          : null,
    })),
  };
}
