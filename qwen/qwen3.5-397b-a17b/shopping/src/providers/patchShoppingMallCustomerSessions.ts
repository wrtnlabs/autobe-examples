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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.status === "active" && {
      expired_at: { gt: now },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: now },
    }),
    ...(props.body.dateFrom && {
      created_at: { gte: new Date(props.body.dateFrom) },
    }),
    ...(props.body.dateTo && {
      created_at: { lte: new Date(props.body.dateTo) },
    }),
  } satisfies Prisma.shopping_mall_customer_sessionsWhereInput;
  const sortParts = (props.body.sort ?? "created_at,desc").split(",");
  const sortField = sortParts[0] ?? "created_at";
  const sortOrder = sortParts[1] ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder === "asc" ? "asc" : "desc",
  } satisfies Prisma.shopping_mall_customer_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      ip: true,
      created_at: true,
      expired_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (session) =>
        ({
          id: session.id,
          ip: session.ip,
          created_at: session.created_at.toISOString(),
          expired_at: session.expired_at.toISOString(),
          isActive: session.expired_at > now,
        }) satisfies IShoppingMallSellerSession.ISummary,
    ),
  } satisfies IPageIShoppingMallSellerSession.ISummary;
}
