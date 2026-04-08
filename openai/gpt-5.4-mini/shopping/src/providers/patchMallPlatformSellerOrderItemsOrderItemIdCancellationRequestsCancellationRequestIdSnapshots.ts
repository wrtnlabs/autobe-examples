import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/MallPlatformCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        mall_platform_seller_id: true,
      },
    });
  if (orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          mall_platform_order_item_id: true,
        },
      },
    );
  if (cancellationRequest.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
    deleted_at: null,
    ...(props.body.search === undefined || props.body.search === null
      ? {}
      : {
          OR: [
            {
              snapshot_status: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              review_result: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { reason: { contains: props.body.search, mode: "insensitive" } },
          ],
        }),
    ...(props.body.from === undefined || props.body.from === null
      ? {}
      : { changed_at: { gte: props.body.from } }),
    ...(props.body.to === undefined || props.body.to === null
      ? {}
      : { changed_at: { lte: props.body.to } }),
  } satisfies Prisma.mall_platform_cancellation_request_snapshotsWhereInput;
  const sortField = props.body.sort ?? "changed_at";
  const order = props.body.order ?? "desc";
  const orderBy = (
    sortField === "created_at"
      ? [{ created_at: order }, { id: "desc" }]
      : sortField === "updated_at"
        ? [{ updated_at: order }, { id: "desc" }]
        : sortField === "snapshot_status"
          ? [{ snapshot_status: order }, { id: "desc" }]
          : sortField === "review_result"
            ? [{ review_result: order }, { id: "desc" }]
            : sortField === "reason"
              ? [{ reason: order }, { id: "desc" }]
              : [{ changed_at: order }, { id: "desc" }]
  ) satisfies Prisma.mall_platform_cancellation_request_snapshotsOrderByWithRelationInput[];
  const total =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.count({
      where,
    });
  const records =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        ...MallPlatformCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
// import { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformCancellationRequestSnapshot.IRequest;
// }): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany({
//     ...MallPlatformCancellationRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformCancellationRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------