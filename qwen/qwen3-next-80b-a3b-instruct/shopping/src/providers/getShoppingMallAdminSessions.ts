import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSessions(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallAdminSession> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
    where: {
      admin_id: props.admin.id,
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      expired_at: true,
      ip: true,
      href: true,
      referrer: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_admin_sessions.count({
    where: {
      admin_id: props.admin.id,
    },
  });
  return {
    data: data.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(session.created_at) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(session.expired_at) as string &
        tags.Format<"date-time">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
