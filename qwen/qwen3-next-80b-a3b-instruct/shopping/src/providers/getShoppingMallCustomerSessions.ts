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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
}): Promise<IPageIShoppingMallAdminSession> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const sessions =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        is_active: true,
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
        is_active: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
      is_active: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(session.created_at) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(session.expired_at) as string &
        tags.Format<"date-time">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer === null ? undefined : session.referrer,
      is_active: session.is_active,
    })),
  };
}
