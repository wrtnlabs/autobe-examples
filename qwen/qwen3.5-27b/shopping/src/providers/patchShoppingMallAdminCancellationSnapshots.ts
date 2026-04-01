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
  if (
    props.body.customerId !== undefined ||
    props.body.sellerId !== undefined ||
    props.body.status !== undefined ||
    props.body.orderId !== undefined
  ) {
    whereInput.cancellationRequest =
      {} as Prisma.shopping_mall_cancellation_requestsWhereInput;
    if (props.body.customerId !== undefined) {
      whereInput.cancellationRequest.shopping_mall_customer_id =
        props.body.customerId;
    }
    if (props.body.sellerId !== undefined) {
      whereInput.cancellationRequest.shopping_mall_seller_id =
        props.body.sellerId;
    }
    if (props.body.status !== undefined) {
      whereInput.cancellationRequest.status = props.body.status;
    }
    if (props.body.orderId !== undefined) {
      whereInput.cancellationRequest.orderItem = {
        shopping_mall_order_id: props.body.orderId,
      } satisfies Prisma.shopping_mall_order_itemsWhereInput;
    }
  }
  if (props.body.dateRange !== undefined) {
    const dateRange = props.body.dateRange;
    const createdAtInput: Prisma.DateTimeFilter = {};
    if (dateRange.from !== undefined) {
      createdAtInput.gte = new Date(dateRange.from);
    }
    if (dateRange.to !== undefined) {
      createdAtInput.lte = new Date(dateRange.to);
    }
    whereInput.created_at = createdAtInput;
  }
  const orderByInput: Prisma.shopping_mall_cancellation_snapshotsOrderByWithRelationInput =
    props.body.sortBy !== undefined
      ? { [props.body.sortBy]: props.body.sortOrder ?? "desc" }
      : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCancellationSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_cancellation_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationSnapshotAtSummaryTransformer.transform,
    ),
  };
}
