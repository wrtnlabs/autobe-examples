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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancellationSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const cancellationRequestFilter: Prisma.shopping_mall_cancellation_requestsWhereInput =
    {
      shopping_mall_customer_id: props.customer.id,
    };
  if (props.body.cancellationRequestId) {
    cancellationRequestFilter.id = props.body.cancellationRequestId;
  }
  if (props.body.status) {
    cancellationRequestFilter.status = props.body.status;
  }
  if (props.body.orderId) {
    cancellationRequestFilter.orderItem = {
      shopping_mall_order_id: props.body.orderId,
    };
  }
  const whereInput: Prisma.shopping_mall_cancellation_snapshotsWhereInput = {
    cancellationRequest: cancellationRequestFilter,
  };
  if (props.body.dateRange) {
    const dateConditions: Prisma.DateTimeFilter = {};
    if (props.body.dateRange.from) {
      dateConditions.gte = new Date(props.body.dateRange.from);
    }
    if (props.body.dateRange.to) {
      dateConditions.lte = new Date(props.body.dateRange.to);
    }
    whereInput.created_at = dateConditions;
  }
  const orderByInput: Prisma.shopping_mall_cancellation_snapshotsOrderByWithRelationInput =
    props.body.sortBy
      ? { [props.body.sortBy]: props.body.sortOrder ?? "desc" }
      : { created_at: "desc" };
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
    },
  };
}
