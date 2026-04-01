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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberCancellationRequests(props: {
  member: MemberPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const orderItemIdFilter = props.body.shoppingMallOrderItemId;
  const statusFilter = props.body.status;
  const includeDeleted = props.body.includeDeleted ?? false;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const requestedAtRange =
    props.body.requestedAtFrom || props.body.requestedAtTo
      ? {
          ...(props.body.requestedAtFrom
            ? { gte: toISOStringSafe(props.body.requestedAtFrom) }
            : {}),
          ...(props.body.requestedAtTo
            ? { lte: toISOStringSafe(props.body.requestedAtTo) }
            : {}),
        }
      : undefined;
  const createdAtRange =
    props.body.createdAtFrom || props.body.createdAtTo
      ? {
          ...(props.body.createdAtFrom
            ? { gte: toISOStringSafe(props.body.createdAtFrom) }
            : {}),
          ...(props.body.createdAtTo
            ? { lte: toISOStringSafe(props.body.createdAtTo) }
            : {}),
        }
      : undefined;
  const sellerDecisionedAtRange =
    props.body.sellerDecisionedAtFrom || props.body.sellerDecisionedAtTo
      ? {
          ...(props.body.sellerDecisionedAtFrom
            ? { gte: toISOStringSafe(props.body.sellerDecisionedAtFrom) }
            : {}),
          ...(props.body.sellerDecisionedAtTo
            ? { lte: toISOStringSafe(props.body.sellerDecisionedAtTo) }
            : {}),
        }
      : undefined;
  const whereInput = {
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(orderItemIdFilter
      ? { shopping_mall_order_item_id: orderItemIdFilter }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(requestedAtRange
      ? { requested_at: requestedAtRange as Prisma.StringFilter }
      : {}),
    ...(createdAtRange
      ? { created_at: createdAtRange as Prisma.StringFilter }
      : {}),
    ...(sellerDecisionedAtRange
      ? {
          seller_decisioned_at:
            sellerDecisionedAtRange as Prisma.StringNullableFilter,
        }
      : {}),
    orderItem: {
      is: {
        order: {
          is: {
            shopping_customer_id: props.member.id,
          },
        },
      },
    },
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const orderByInput =
    sortBy === "created_at"
      ? ({ created_at: sortDirection } as const)
      : sortBy === "requested_at"
        ? ({ requested_at: sortDirection } as const)
        : ({ seller_decisioned_at: sortDirection } as const);
  if (props.body.newStatus !== undefined) {
    throw new HttpException(
      "Workflow transitions require a target cancellation request id, which is not provided for this endpoint.",
      400,
    );
  }
  if (props.body.sellerDecisionedAt !== undefined) {
    throw new HttpException(
      "sellerDecisionedAt is only allowed with newStatus, but this endpoint does not support workflow transitions.",
      400,
    );
  }
  if (props.body.sellerResponseReason !== undefined) {
    throw new HttpException(
      "sellerResponseReason is only allowed with newStatus, but this endpoint does not support workflow transitions.",
      400,
    );
  }
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereInput,
    },
  );
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderByInput as any,
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
