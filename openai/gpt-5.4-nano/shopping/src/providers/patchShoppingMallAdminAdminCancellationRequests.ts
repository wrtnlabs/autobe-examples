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
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const page = props.body.page ?? 1;
  const limitRequested = props.body.limit ?? 20;
  const limit = limitRequested > 100 ? 100 : limitRequested;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_cancellation_requestsWhereInput = {
    ...(props.body.includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.shoppingMallOrderItemId
      ? { shopping_mall_order_item_id: props.body.shoppingMallOrderItemId }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.requestedAtFrom !== undefined ||
    props.body.requestedAtTo !== undefined
      ? {
          requested_at: {
            ...(props.body.requestedAtFrom !== undefined
              ? { gte: props.body.requestedAtFrom }
              : {}),
            ...(props.body.requestedAtTo !== undefined
              ? { lte: props.body.requestedAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.sellerDecisionedAtFrom !== undefined ||
    props.body.sellerDecisionedAtTo !== undefined
      ? {
          seller_decisioned_at: {
            ...(props.body.sellerDecisionedAtFrom !== undefined
              ? { gte: props.body.sellerDecisionedAtFrom }
              : {}),
            ...(props.body.sellerDecisionedAtTo !== undefined
              ? { lte: props.body.sellerDecisionedAtTo }
              : {}),
          },
        }
      : {}),
  };
  const direction = props.body.sortDirection ?? "desc";
  const sortBy = props.body.sortBy ?? "created_at";
  const orderBy: Prisma.Enumerable<Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput> =
    sortBy === "requested_at"
      ? [{ requested_at: direction }, { created_at: "desc" }, { id: "desc" }]
      : sortBy === "seller_decisioned_at"
        ? [
            { seller_decisioned_at: direction },
            { created_at: "desc" },
            { id: "desc" },
          ]
        : [{ created_at: direction }, { id: "desc" }];
  const items =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
    });
  const records =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: items.map((x) => {
      return {
        id: x.id,
        shopping_mall_order_item_id: x.shopping_mall_order_item_id,
        reason: x.reason,
        requested_at: toISOStringSafe(x.requested_at),
        status: x.status,
        seller_decisioned_at:
          x.seller_decisioned_at === null
            ? null
            : toISOStringSafe(x.seller_decisioned_at),
        seller_response_reason: x.seller_response_reason,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at:
          x.deleted_at === null ? null : toISOStringSafe(x.deleted_at),
      } satisfies IShoppingMallCancellationRequest.ISummary;
    }),
  };
}
