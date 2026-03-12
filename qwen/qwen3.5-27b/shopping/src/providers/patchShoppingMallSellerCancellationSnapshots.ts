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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerCancellationSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallCancellationSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderItemFilter: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
  };
  if (props.body.orderId !== undefined) {
    orderItemFilter.shopping_mall_order_id = props.body.orderId;
  }
  const cancellationRequestFilter: Prisma.shopping_mall_cancellation_requestsWhereInput =
    {
      orderItem: orderItemFilter,
    };
  if (props.body.cancellationRequestId !== undefined) {
    cancellationRequestFilter.id = props.body.cancellationRequestId;
  }
  if (props.body.customerId !== undefined) {
    cancellationRequestFilter.shopping_mall_customer_id = props.body.customerId;
  }
  if (props.body.sellerId !== undefined) {
    cancellationRequestFilter.shopping_mall_seller_id = props.body.sellerId;
  }
  if (props.body.status !== undefined) {
    cancellationRequestFilter.status = props.body.status;
  }
  const whereInput: Prisma.shopping_mall_cancellation_snapshotsWhereInput = {
    cancellationRequest: cancellationRequestFilter,
  };
  if (props.body.dateRange !== undefined) {
    const dateFilters: Prisma.shopping_mall_cancellation_snapshotsWhereInput[] =
      [];
    if (props.body.dateRange.from !== undefined) {
      dateFilters.push({
        created_at: { gte: new Date(props.body.dateRange.from) },
      });
    }
    if (props.body.dateRange.to !== undefined) {
      dateFilters.push({
        created_at: { lte: new Date(props.body.dateRange.to) },
      });
    }
    if (dateFilters.length > 0) {
      whereInput.AND = dateFilters;
    }
  }
  const orderByInput: Prisma.shopping_mall_cancellation_snapshotsOrderByWithRelationInput =
    props.body.sortBy !== undefined && props.body.sortOrder !== undefined
      ? ({
          [props.body.sortBy]: props.body.sortOrder,
        } as Prisma.shopping_mall_cancellation_snapshotsOrderByWithRelationInput)
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
    } satisfies IPage.IPagination,
  };
}
