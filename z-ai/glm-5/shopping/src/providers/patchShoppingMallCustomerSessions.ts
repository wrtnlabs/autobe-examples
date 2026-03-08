import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
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
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const conditions: Prisma.shopping_mall_customer_sessionsWhereInput["AND"] = [
    { customer_id: props.customer.id },
  ];
  // Date range filter: from
  if (props.body.from !== undefined) {
    conditions.push({ created_at: { gte: new Date(props.body.from) } });
  }
  // Date range filter: to
  if (props.body.to !== undefined) {
    conditions.push({ created_at: { lte: new Date(props.body.to) } });
  }
  // Cursor-based pagination
  if (props.body.created_at !== undefined && props.body.id !== undefined) {
    conditions.push({
      OR: [
        { created_at: { lt: new Date(props.body.created_at) } },
        {
          created_at: new Date(props.body.created_at),
          id: { lt: props.body.id },
        },
      ],
    });
  }
  const whereInput = {
    AND: conditions,
  } satisfies Prisma.shopping_mall_customer_sessionsWhereInput;
  const sessions =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where: whereInput,
  });
  const data: IShoppingMallSellerSession.ISummary[] = sessions.map(
    (session) => ({
      id: session.id,
      ip: session.ip ?? "",
      href: session.href ?? "",
      referrer: session.referrer ?? null,
      created_at: session.created_at.toISOString(),
      expired_at: session.expired_at.toISOString(),
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
