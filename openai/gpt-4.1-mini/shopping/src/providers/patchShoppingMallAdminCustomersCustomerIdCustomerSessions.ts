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

export async function patchShoppingMallAdminCustomersCustomerIdCustomerSessions(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit >= 1 && props.body.limit <= 100 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_customer_id: props.customerId,
    ...(props.body.search_term
      ? {
          OR: [
            { ip: { contains: props.body.search_term } },
            { href: { contains: props.body.search_term } },
            { referrer: { contains: props.body.search_term } },
          ],
        }
      : {}),
  };

  const orderBy: { created_at: "asc" | "desc" } | { ip: "asc" | "desc" } =
    props.body.sort_by === "login_time"
      ? { created_at: props.body.order ?? "desc" }
      : props.body.sort_by === "ip_address"
        ? { ip: props.body.order ?? "asc" }
        : { created_at: "desc" };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      shopping_mall_customer_id: session.shopping_mall_customer_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
