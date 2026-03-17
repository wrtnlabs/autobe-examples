import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminSession";
import { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSuperAdminSessionAtSummaryTransformer } from "../transformers/ShoppingMallSuperAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallSuperAdminSession.IRequest;
}): Promise<IPageIShoppingMallSuperAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const ipFilter:
    | Prisma.shopping_mall_super_admin_sessionsWhereInput
    | undefined =
    props.body.ip !== null && props.body.ip !== undefined
      ? {
          OR: [
            { ip: { equals: props.body.ip } },
            { ip: { startsWith: props.body.ip } },
          ],
        }
      : undefined;
  const isActiveFilter:
    | Prisma.shopping_mall_super_admin_sessionsWhereInput
    | undefined =
    props.body.isActive === true
      ? { expired_at: { gt: now } }
      : props.body.isActive === false
        ? { expired_at: { lte: now } }
        : undefined;
  const createdAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_super_admin_sessions">
    | undefined =
    (props.body.createdAtFrom !== null &&
      props.body.createdAtFrom !== undefined) ||
    (props.body.createdAtTo !== null && props.body.createdAtTo !== undefined)
      ? {
          ...(props.body.createdAtFrom !== null &&
          props.body.createdAtFrom !== undefined
            ? { gte: new Date(props.body.createdAtFrom) }
            : {}),
          ...(props.body.createdAtTo !== null &&
          props.body.createdAtTo !== undefined
            ? { lte: new Date(props.body.createdAtTo) }
            : {}),
        }
      : undefined;
  const expiredAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_super_admin_sessions">
    | undefined =
    (props.body.expiredAtFrom !== null &&
      props.body.expiredAtFrom !== undefined) ||
    (props.body.expiredAtTo !== null && props.body.expiredAtTo !== undefined)
      ? {
          ...(props.body.expiredAtFrom !== null &&
          props.body.expiredAtFrom !== undefined
            ? { gte: new Date(props.body.expiredAtFrom) }
            : {}),
          ...(props.body.expiredAtTo !== null &&
          props.body.expiredAtTo !== undefined
            ? { lte: new Date(props.body.expiredAtTo) }
            : {}),
        }
      : undefined;
  // Merge expired_at filter: isActive takes priority over explicit range
  // if both are present, combine them (AND semantics)
  const mergedExpiredAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_super_admin_sessions">
    | undefined =
    isActiveFilter !== undefined && expiredAtFilter !== undefined
      ? {
          ...(isActiveFilter.expired_at as Prisma.DateTimeFilter<"shopping_mall_super_admin_sessions">),
          ...expiredAtFilter,
        }
      : isActiveFilter !== undefined
        ? (isActiveFilter.expired_at as Prisma.DateTimeFilter<"shopping_mall_super_admin_sessions">)
        : expiredAtFilter;
  const whereInput = {
    ...(ipFilter ?? {}),
    ...(mergedExpiredAtFilter !== undefined
      ? { expired_at: mergedExpiredAtFilter }
      : {}),
    ...(createdAtFilter !== undefined ? { created_at: createdAtFilter } : {}),
  } satisfies Prisma.shopping_mall_super_admin_sessionsWhereInput;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const orderByInput = (
    sort === "expired_at" ? { expired_at: order } : { created_at: order }
  ) satisfies Prisma.shopping_mall_super_admin_sessionsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallSuperAdminSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_super_admin_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSuperAdminSessionAtSummaryTransformer.transform,
    ),
  };
}
