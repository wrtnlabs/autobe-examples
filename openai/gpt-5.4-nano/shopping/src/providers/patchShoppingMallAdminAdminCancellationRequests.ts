import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminCancellationRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Invalid page", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const where = {
    ...(props.body.includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.shoppingMallOrderItemId
      ? { shopping_mall_order_item_id: props.body.shoppingMallOrderItemId }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.requestedAtFrom || props.body.requestedAtTo
      ? {
          requested_at: {
            ...(props.body.requestedAtFrom
              ? { gte: props.body.requestedAtFrom }
              : {}),
            ...(props.body.requestedAtTo
              ? { lte: props.body.requestedAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo ? { lte: props.body.createdAtTo } : {}),
          },
        }
      : {}),
    ...(props.body.sellerDecisionedAtFrom || props.body.sellerDecisionedAtTo
      ? {
          seller_decisioned_at: {
            ...(props.body.sellerDecisionedAtFrom
              ? { gte: props.body.sellerDecisionedAtFrom }
              : {}),
            ...(props.body.sellerDecisionedAtTo
              ? { lte: props.body.sellerDecisionedAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const orderBy = (
    sortBy === "requested_at"
      ? { requested_at: sortDirection }
      : sortBy === "seller_decisioned_at"
        ? { seller_decisioned_at: sortDirection }
        : { created_at: sortDirection }
  ) satisfies Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        reason: true,
        requested_at: true,
        status: true,
        seller_decisioned_at: true,
        seller_response_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_cancellation_requests.count({ where }),
  ]);
  return {
    data: records.map((r) => ({
      id: typia.assert(r.id),
      shopping_mall_order_item_id: typia.assert(r.shopping_mall_order_item_id),
      reason: r.reason,
      requested_at: toISOStringSafe(r.requested_at),
      status: r.status,
      seller_decisioned_at:
        r.seller_decisioned_at === null
          ? null
          : toISOStringSafe(r.seller_decisioned_at),
      seller_response_reason: r.seller_response_reason,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
