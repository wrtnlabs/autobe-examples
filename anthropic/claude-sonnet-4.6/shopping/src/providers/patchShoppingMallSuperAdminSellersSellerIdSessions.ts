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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSellerSessionAtSummaryTransformer } from "../transformers/ShoppingMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminSellersSellerIdSessions(props: {
  superAdmin: SuperadminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  // 1. Verify the seller exists (404 if not found)
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  const now = new Date();
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 2. Build orderBy safely with explicit ternary (avoids computed-key type errors)
  const orderByInput = (
    props.body.sortBy === "expired_at"
      ? { expired_at: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" }
  ) satisfies Prisma.shopping_mall_seller_sessionsOrderByWithRelationInput;
  // 3. Build created_at range filter
  const createdAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_seller_sessions">
    | undefined =
    props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          ...(props.body.createdAtFrom != null && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo != null && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  // 4. Build expired_at range filter (merge explicit bounds with isExpired shorthand)
  const expiredAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_seller_sessions">
    | undefined = (() => {
    const hasExplicitRange =
      props.body.expiredAtFrom != null || props.body.expiredAtTo != null;
    if (hasExplicitRange) {
      return {
        ...(props.body.expiredAtFrom != null && {
          gte: new Date(props.body.expiredAtFrom),
        }),
        ...(props.body.expiredAtTo != null && {
          lte: new Date(props.body.expiredAtTo),
        }),
      } satisfies Prisma.DateTimeFilter<"shopping_mall_seller_sessions">;
    }
    if (props.body.isExpired === true) {
      return {
        lt: now,
      } satisfies Prisma.DateTimeFilter<"shopping_mall_seller_sessions">;
    }
    if (props.body.isExpired === false) {
      return {
        gte: now,
      } satisfies Prisma.DateTimeFilter<"shopping_mall_seller_sessions">;
    }
    return undefined;
  })();
  // 5. Assemble the full where clause
  const whereInput = {
    shopping_mall_seller_id: props.sellerId,
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(expiredAtFilter !== undefined && { expired_at: expiredAtFilter }),
    ...(props.body.ip != null && {
      ip: { contains: props.body.ip, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_seller_sessionsWhereInput;
  // 6. Query sessions and total count
  const data = await MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
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
      data,
      ShoppingMallSellerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
