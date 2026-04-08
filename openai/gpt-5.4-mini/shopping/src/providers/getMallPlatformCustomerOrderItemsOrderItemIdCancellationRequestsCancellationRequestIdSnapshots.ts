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

export async function getMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow({
    where: {
      id: props.cancellationRequestId,
      mall_platform_order_item_id: props.orderItemId,
    },
    select: {
      id: true,
    },
  });
  const page = 1;
  const limit = 100;
  const where = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
  } satisfies Prisma.mall_platform_cancellation_request_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        ...MallPlatformCancellationRequestSnapshotAtSummaryTransformer.select(),
        where,
        orderBy: {
          created_at: "desc",
        },
        skip: (page - 1) * limit,
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
// import { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
// import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
//   customer: CustomerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   cancellationRequestId: string & tags.Format<"uuid">;
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