import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
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

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.shoppingMallCustomerId && {
      shopping_mall_customer_id: props.body.shoppingMallCustomerId,
    }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.href && { href: { contains: props.body.href } }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
  } satisfies Prisma.shopping_mall_customer_sessionsWhereInput;
  const sessions =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where,
  });
  return {
    data: sessions.map((s) => ({
      id: s.id,
      shoppingMallCustomerId: s.shopping_mall_customer_id,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      createdAt: toISOStringSafe(s.created_at),
      expiredAt: toISOStringSafe(s.expired_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
