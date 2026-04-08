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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/MallPlatformCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
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
  const search = props.body.search;
  const from = props.body.from;
  const to = props.body.to;
  const order = props.body.order ?? "desc";
  const where: Prisma.mall_platform_cancellation_request_snapshotsWhereInput = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
    ...(search === undefined || search === null || search === ""
      ? {}
      : {
          OR: [
            { snapshot_status: { contains: search, mode: "insensitive" } },
            { review_result: { contains: search, mode: "insensitive" } },
            { reason: { contains: search, mode: "insensitive" } },
          ],
        }),
    ...(from === undefined && to === undefined
      ? {}
      : {
          changed_at: {
            ...(from === undefined || from === null ? {} : { gte: from }),
            ...(to === undefined || to === null ? {} : { lte: to }),
          },
        }),
  };
  const orderBy: Prisma.mall_platform_cancellation_request_snapshotsOrderByWithRelationInput[] =
    props.body.sort === "changed_at"
      ? [{ changed_at: order }, { id: "desc" }]
      : props.body.sort === "updated_at"
        ? [{ updated_at: order }, { id: "desc" }]
        : [{ created_at: order }, { id: "desc" }];
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
// export async function patchMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
//   administrator: AdministratorPayload;
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