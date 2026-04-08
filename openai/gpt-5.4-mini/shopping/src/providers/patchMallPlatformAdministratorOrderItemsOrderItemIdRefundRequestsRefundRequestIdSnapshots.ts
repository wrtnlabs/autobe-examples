import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformRefundRequestSnapshotAtSummaryTransformer } from "../transformers/MallPlatformRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorOrderItemsOrderItemIdRefundRequestsRefundRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformRefundRequestSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
    where: { id: props.orderItemId },
    select: { id: true },
  });
  await MyGlobal.prisma.mall_platform_refund_requests.findFirstOrThrow({
    where: {
      id: props.refundRequestId,
      mall_platform_order_item_id: props.orderItemId,
    },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy =
    props.body.sort === "createdAtAsc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const where: Prisma.mall_platform_refund_request_snapshotsWhereInput = {
    mall_platform_refund_request_id: props.refundRequestId,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              reviewer_role: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              reviewer_note: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
    ...(props.body.createdAtFrom === undefined ||
    props.body.createdAtFrom === null
      ? {}
      : { created_at: { gte: toISOStringSafe(props.body.createdAtFrom) } }),
    ...(props.body.createdAtTo === undefined || props.body.createdAtTo === null
      ? {}
      : { created_at: { lte: toISOStringSafe(props.body.createdAtTo) } }),
  };
  const records =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.count({
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
      MallPlatformRefundRequestSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
// import { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorOrderItemsOrderItemIdRefundRequestsRefundRequestIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   refundRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformRefundRequestSnapshot.IRequest;
// }): Promise<IPageIMallPlatformRefundRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_refund_request_snapshots.findMany({
//     ...MallPlatformRefundRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformRefundRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------