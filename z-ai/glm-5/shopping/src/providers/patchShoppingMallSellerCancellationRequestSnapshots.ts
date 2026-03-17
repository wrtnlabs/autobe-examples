import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerCancellationRequestSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build created_at date range filter
  const createdAtFilter:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.from || props.body.to
      ? {
          ...(props.body.from && { gte: new Date(props.body.from) }),
          ...(props.body.to && { lte: new Date(props.body.to) }),
        }
      : undefined;
  const whereInput = {
    cancellationRequest: {
      orderItem: {
        product: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    },
    ...(props.body.shopping_mall_cancellation_request_id && {
      shopping_mall_cancellation_request_id:
        props.body.shopping_mall_cancellation_request_id,
    }),
    ...(props.body.status != null && { status: props.body.status }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
