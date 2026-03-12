import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCancellationSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCancellationSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallCancellationSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_cancellation_snapshotsWhereInput = {};
  if (props.body.cancellationRequestId !== undefined) {
    whereInput.shopping_mall_cancellation_request_id =
      props.body.cancellationRequestId;
  }
  const cancellationRequestFilter: any = {};
  if (props.body.customerId !== undefined) {
    cancellationRequestFilter.shopping_mall_customer_id = props.body.customerId;
  }
  if (props.body.sellerId !== undefined) {
    cancellationRequestFilter.shopping_mall_seller_id = props.body.sellerId;
  }
  if (props.body.status !== undefined) {
    cancellationRequestFilter.status = props.body.status;
  }
  if (props.body.orderId !== undefined) {
    cancellationRequestFilter.orderItem = {
      shopping_mall_order_id: props.body.orderId,
    };
  }
  if (Object.keys(cancellationRequestFilter).length > 0) {
    whereInput.cancellationRequest = cancellationRequestFilter;
  }
  if (props.body.dateRange !== undefined) {
    const dateConditions: Prisma.DateTimeFilter = {};
    if (props.body.dateRange.from !== undefined) {
      dateConditions.gte = new Date(props.body.dateRange.from);
    }
    if (props.body.dateRange.to !== undefined) {
      dateConditions.lte = new Date(props.body.dateRange.to);
    }
    whereInput.created_at = dateConditions;
  }
  const orderByInput: Prisma.shopping_mall_cancellation_snapshotsOrderByWithRelationInput =
    {};
  if (props.body.sortBy !== undefined) {
    const sortOrder = props.body.sortOrder ?? "desc";
    if (props.body.sortBy === "id") {
      orderByInput.id = sortOrder;
    } else if (props.body.sortBy === "cancellationRequestId") {
      orderByInput.shopping_mall_cancellation_request_id = sortOrder;
    } else if (props.body.sortBy === "createdAt") {
      orderByInput.created_at = sortOrder;
    }
  } else {
    orderByInput.created_at = "desc";
  }
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCancellationSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
