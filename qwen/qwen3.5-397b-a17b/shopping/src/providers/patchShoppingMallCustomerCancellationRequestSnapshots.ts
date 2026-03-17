import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancellationRequestSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_cancellation_request_snapshotsWhereInput =
    {
      ...(props.body.status && { status: props.body.status }),
      ...(props.body.requestedAtFrom || props.body.requestedAtTo
        ? {
            requested_at: {
              ...(props.body.requestedAtFrom && {
                gte: props.body.requestedAtFrom,
              }),
              ...(props.body.requestedAtTo && {
                lte: props.body.requestedAtTo,
              }),
            },
          }
        : {}),
      ...(props.body.respondedAtFrom || props.body.respondedAtTo
        ? {
            responded_at: {
              not: null,
              ...(props.body.respondedAtFrom && {
                gte: props.body.respondedAtFrom,
              }),
              ...(props.body.respondedAtTo && {
                lte: props.body.respondedAtTo,
              }),
            },
          }
        : {}),
      ...(props.body.respondedBySellerId && {
        responded_by_seller_id: props.body.respondedBySellerId,
      }),
      ...(props.body.cancellationRequestId && {
        cancellation_request_id: props.body.cancellationRequestId,
      }),
    };
  const orderByInput: Prisma.shopping_mall_cancellation_request_snapshotsOrderByWithRelationInput =
    (() => {
      if (!props.body.sort) {
        return { created_at: "desc" };
      }
      const [field, direction] = props.body.sort.split(",");
      const dir = direction === "asc" ? "asc" : "desc";
      if (field === "created_at") {
        return { created_at: dir };
      } else if (field === "requested_at") {
        return { requested_at: dir };
      } else {
        return { responded_at: dir };
      }
    })();
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
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
