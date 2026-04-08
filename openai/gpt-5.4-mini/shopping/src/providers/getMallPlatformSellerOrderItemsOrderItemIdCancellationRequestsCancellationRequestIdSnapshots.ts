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

export async function getMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
      },
    });
  if (orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Not found", 404);
  }
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
        },
        select: {
          id: true,
          mall_platform_order_item_id: true,
        },
      },
    );
  if (cancellationRequest.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Not found", 404);
  }
  const where = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
  } satisfies Prisma.mall_platform_cancellation_request_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        where,
        orderBy: {
          created_at: "desc",
        },
        ...MallPlatformCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const recordsCount =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: 1,
      limit: recordsCount === 0 ? 1 : recordsCount,
      records: recordsCount,
      pages: recordsCount === 0 ? 0 : 1,
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
// export async function getMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
//   seller: SellerPayload;
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