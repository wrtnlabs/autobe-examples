import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallAdminShoppingMallCustomersShoppingMallCustomerIdShoppingMallCustomerSessions(props: {
  admin: AdminPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const orderBy: { [key: string]: "asc" | "desc" } = {};
  orderBy[props.body.sortBy] = props.body.order;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: {
        shopping_mall_customer_id: props.shoppingMallCustomerId,
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.count({
      where: {
        shopping_mall_customer_id: props.shoppingMallCustomerId,
      },
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
      id: session.id,
      shopping_mall_customer_id: session.shopping_mall_customer_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    })),
  };
}
