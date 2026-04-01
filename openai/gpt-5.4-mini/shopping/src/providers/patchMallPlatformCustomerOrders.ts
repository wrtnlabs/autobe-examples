import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
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

export async function patchMallPlatformCustomerOrders(props: {
  customer: CustomerPayload;
  body: IMallPlatformOrder.IRequest;
}): Promise<IPageIMallPlatformOrder.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
          OR: [
            {
              order_number: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              status: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.status !== undefined && props.body.status !== ""
      ? { status: props.body.status }
      : {}),
    ...(props.body.createdAtFrom !== undefined
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo !== undefined
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
  } satisfies Prisma.mall_platform_ordersWhereInput;
  const orderBy =
    props.body.sort === undefined || props.body.sort === "newest"
      ? ({
          created_at: "desc",
        } satisfies Prisma.mall_platform_ordersOrderByWithRelationInput)
      : props.body.sort === "oldest"
        ? ({
            created_at: "asc",
          } satisfies Prisma.mall_platform_ordersOrderByWithRelationInput)
        : (() => {
            throw new HttpException("Invalid sort option", 400);
          })();
  const records = await MyGlobal.prisma.mall_platform_orders.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      order_number: true,
      status: true,
      total_amount: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.mall_platform_orders.count({ where });
  return {
    data: records.map(
      (record) =>
        ({
          id: record.id,
          orderNumber: record.order_number,
          status: record.status,
          totalAmount: record.total_amount,
          createdAt: toISOStringSafe(record.created_at),
        }) satisfies IMallPlatformOrder.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
