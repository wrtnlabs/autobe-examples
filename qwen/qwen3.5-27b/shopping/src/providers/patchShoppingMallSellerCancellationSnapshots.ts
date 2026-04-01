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
  const cancellationRequest: any = {
    shopping_mall_seller_id: props.seller.id,
  };
  if (props.body.cancellationRequestId !== undefined) {
    cancellationRequest.shopping_mall_cancellation_request_id =
      props.body.cancellationRequestId;
  }
  if (props.body.customerId !== undefined) {
    cancellationRequest.shopping_mall_customer_id = props.body.customerId;
  }
  if (props.body.sellerId !== undefined) {
    cancellationRequest.shopping_mall_seller_id = props.body.sellerId;
  }
  if (props.body.status !== undefined) {
    cancellationRequest.status = props.body.status as any;
  }
  const whereInput: any = {
    cancellationRequest,
  };
  if (props.body.dateRange?.from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.dateRange.from),
    };
  }
  if (props.body.dateRange?.to !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.dateRange.to),
    };
  }
  if (props.body.orderId !== undefined) {
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          shopping_mall_order_id: props.body.orderId,
        },
        select: {
          id: true,
        },
      },
    );
    const orderItemIds = orderItems.map((item) => item.id);
    cancellationRequest.shopping_mall_order_item_id = {
      in: orderItemIds,
    };
  }
  const orderByInput =
    props.body.sortBy !== undefined && props.body.sortOrder !== undefined
      ? props.body.sortBy === "id"
        ? ({ id: props.body.sortOrder } as const)
        : props.body.sortBy === "cancellationRequestId"
          ? { cancellationRequest: { id: props.body.sortOrder } }
          : { created_at: props.body.sortOrder }
      : { created_at: "desc" as const };
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationSnapshotAtSummaryTransformer.transform,
    ),
  };
}
