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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/MallPlatformCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
    where: {
      id: props.cancellationRequestId,
      mall_platform_order_item_id: props.orderItemId,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const keyword =
    props.body.search === undefined ||
    props.body.search === null ||
    props.body.search.trim() === ""
      ? null
      : props.body.search;
  const from = props.body.from ?? null;
  const to = props.body.to ?? null;
  const sort = props.body.sort ?? "changed_at";
  const order = props.body.order ?? "desc";
  const where: Prisma.mall_platform_cancellation_request_snapshotsWhereInput = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
    ...(keyword === null
      ? {}
      : {
          OR: [
            { snapshot_status: { contains: keyword, mode: "insensitive" } },
            { review_result: { contains: keyword, mode: "insensitive" } },
            { reason: { contains: keyword, mode: "insensitive" } },
          ],
        }),
    ...(from === null ? {} : { changed_at: { gte: from } }),
    ...(to === null ? {} : { changed_at: { lte: to } }),
  };
  const orderBy: Prisma.mall_platform_cancellation_request_snapshotsOrderByWithRelationInput[] =
    sort === "snapshot_status"
      ? [{ snapshot_status: order }, { id: order }]
      : sort === "review_result"
        ? [{ review_result: order }, { id: order }]
        : sort === "reason"
          ? [{ reason: order }, { id: order }]
          : sort === "changed_at"
            ? [{ changed_at: order }, { id: order }]
            : sort === "id"
              ? [{ id: order }]
              : [{ changed_at: "desc" }, { id: "desc" }];
  const records =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        ...MallPlatformCancellationRequestSnapshotAtSummaryTransformer.select(),
        where,
        orderBy,
        skip,
        take: limit,
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.count({
      where,
    });
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
// export async function patchMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
//   customer: CustomerPayload;
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