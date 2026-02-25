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
import { ShoppingMallCustomerSessionAtSummaryTransformer } from "../transformers/ShoppingMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip, mode: "insensitive" as const },
    }),
    ...(props.body.deviceName !== undefined && {
      user_agent: {
        contains: props.body.deviceName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.createdFrom !== undefined &&
    props.body.createdTo !== undefined
      ? {
          created_at: {
            gte: new Date(props.body.createdFrom),
            lte: new Date(props.body.createdTo),
          },
        }
      : {
          ...(props.body.createdFrom !== undefined && {
            created_at: { gte: new Date(props.body.createdFrom) },
          }),
          ...(props.body.createdTo !== undefined && {
            created_at: { lte: new Date(props.body.createdTo) },
          }),
        }),
    ...(props.body.expired === false && {
      expired_at: { gt: new Date() },
    }),
  } satisfies Prisma.shopping_mall_customer_sessionsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...ShoppingMallCustomerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
