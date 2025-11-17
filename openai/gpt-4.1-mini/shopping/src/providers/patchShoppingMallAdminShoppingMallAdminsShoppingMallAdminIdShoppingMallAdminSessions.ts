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

export async function patchShoppingMallAdminShoppingMallAdminsShoppingMallAdminIdShoppingMallAdminSessions(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.shopping_mall_admin_sessionsWhereInput = {
    shopping_mall_admin_id: props.shoppingMallAdminId,
    AND: [
      {
        OR: [
          { ip: { contains: props.body.search ?? "" } },
          { href: { contains: props.body.search ?? "" } },
          { referrer: { contains: props.body.search ?? "" } },
        ],
      },
      {
        expired_at: props.body.expired_only ? { not: null } : null,
      },
    ],
  };

  const orderBy: Prisma.shopping_mall_admin_sessionsOrderByWithRelationInput =
    {};

  if (props.body.sort_by) {
    const orderDirection = props.body.order ?? "asc";

    // Cast sort_by to keyof Prisma.shopping_mall_admin_sessionsOrderByWithRelationInput to satisfy indexing
    const key = props.body
      .sort_by as keyof Prisma.shopping_mall_admin_sessionsOrderByWithRelationInput;
    orderBy[key] = orderDirection;
  } else {
    orderBy.created_at = "desc";
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_admin_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      shopping_mall_admin_id: session.shopping_mall_admin_id as string &
        tags.Format<"uuid">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at) as string &
        tags.Format<"date-time">,
      expired_at: session.expired_at
        ? (toISOStringSafe(session.expired_at) as string &
            tags.Format<"date-time">)
        : null,
    })),
  };
}
