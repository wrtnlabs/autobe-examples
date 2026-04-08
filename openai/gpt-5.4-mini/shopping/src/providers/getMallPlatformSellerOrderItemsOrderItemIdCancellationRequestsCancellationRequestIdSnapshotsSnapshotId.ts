import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformCancellationRequestSnapshotTransformer } from "../transformers/MallPlatformCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCancellationRequestSnapshot> {
  await MyGlobal.prisma.mall_platform_order_items.findFirstOrThrow({
    where: {
      id: props.orderItemId,
      seller: {
        id: props.seller.id,
      },
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
    where: {
      id: props.cancellationRequestId,
      orderItem: {
        id: props.orderItemId,
      },
    },
    select: {
      id: true,
    },
  });
  const record =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          cancellationRequest: {
            id: props.cancellationRequestId,
          },
        },
        ...MallPlatformCancellationRequestSnapshotTransformer.select(),
      },
    );
  return await MallPlatformCancellationRequestSnapshotTransformer.transform(
    record,
  );
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
// import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformCancellationRequestSnapshot> {
//   const record = await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findFirstOrThrow({
//     ...MallPlatformCancellationRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformCancellationRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------