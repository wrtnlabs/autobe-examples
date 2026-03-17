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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerSessionAtSummaryTransformer } from "../transformers/ShoppingMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdSessions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  // Step 1: Verify seller exists (returns 404 if not found)
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  // Step 2: Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Sorting defaults
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Step 4: Build where clause inline
  const now = new Date();
  const whereInput = {
    shopping_mall_seller_id: props.sellerId,
    // created_at range filter
    ...(props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          created_at: {
            ...(props.body.createdAtFrom != null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo != null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    // expired_at: isExpired convenience filter takes precedence over explicit date range
    ...(props.body.isExpired === true
      ? { expired_at: { lt: now } }
      : props.body.isExpired === false
        ? { expired_at: { gte: now } }
        : props.body.expiredAtFrom != null || props.body.expiredAtTo != null
          ? {
              expired_at: {
                ...(props.body.expiredAtFrom != null && {
                  gte: new Date(props.body.expiredAtFrom),
                }),
                ...(props.body.expiredAtTo != null && {
                  lte: new Date(props.body.expiredAtTo),
                }),
              },
            }
          : {}),
    // ip partial match (case-insensitive)
    ...(props.body.ip != null
      ? {
          ip: {
            contains: props.body.ip,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_seller_sessionsWhereInput;
  // Step 5: Order by
  const orderByInput = (
    sortBy === "expired_at"
      ? { expired_at: sortOrder }
      : { created_at: sortOrder }
  ) satisfies Prisma.shopping_mall_seller_sessionsOrderByWithRelationInput;
  // Step 6: Query data and total count sequentially
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
  // Step 7: Transform results and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerSessionAtSummaryTransformer.transform,
    ),
  };
}
