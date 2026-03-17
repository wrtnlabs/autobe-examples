import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerSessionAtSummaryTransformer } from "../transformers/ShoppingMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtFrom > props.body.createdAtTo
  ) {
    throw new HttpException("Invalid createdAt range", 400);
  }
  if (
    props.body.expiredAtFrom !== undefined &&
    props.body.expiredAtTo !== undefined &&
    props.body.expiredAtFrom > props.body.expiredAtTo
  ) {
    throw new HttpException("Invalid expiredAt range", 400);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const whereInput = {
    AND: [
      {
        ...(props.body.sessionId !== undefined && {
          id: props.body.sessionId,
        }),
        ...(props.body.sellerId !== undefined && {
          shopping_mall_seller_id: props.body.sellerId,
        }),
        ...(props.body.ip !== undefined && {
          ip: props.body.ip,
        }),
        ...(props.body.href !== undefined && {
          href: props.body.href,
        }),
        ...(props.body.referrer !== undefined && {
          referrer: props.body.referrer,
        }),
        ...((props.body.createdAtFrom !== undefined ||
          props.body.createdAtTo !== undefined) && {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: props.body.createdAtFrom,
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: props.body.createdAtTo,
            }),
          },
        }),
        ...((props.body.expiredAtFrom !== undefined ||
          props.body.expiredAtTo !== undefined) && {
          expired_at: {
            ...(props.body.expiredAtFrom !== undefined && {
              gte: props.body.expiredAtFrom,
            }),
            ...(props.body.expiredAtTo !== undefined && {
              lte: props.body.expiredAtTo,
            }),
          },
        }),
      },
      ...(props.body.isExpired === undefined
        ? []
        : [
            {
              expired_at:
                props.body.isExpired === true ? { lte: now } : { gt: now },
            },
          ]),
    ],
  } satisfies Prisma.shopping_mall_seller_sessionsWhereInput;
  const orderByInput =
    props.body.sortBy === "expiredAt"
      ? { expired_at: props.body.sortDirection ?? "desc" }
      : props.body.sortBy === "ip"
        ? { ip: props.body.sortDirection ?? "asc" }
        : props.body.sortBy === "referrer"
          ? { referrer: props.body.sortDirection ?? "asc" }
          : { created_at: props.body.sortDirection ?? "desc" };
  const rows = await MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSellerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_seller_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallSellerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
