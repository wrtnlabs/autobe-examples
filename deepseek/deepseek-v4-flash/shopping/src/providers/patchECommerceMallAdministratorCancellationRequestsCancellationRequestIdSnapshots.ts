import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorCancellationRequestsCancellationRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IECommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIECommerceMallCancellationRequestSnapshot.ISummary> {
  // Validate the cancellation request exists
  await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findUniqueOrThrow(
    {
      where: { id: props.cancellationRequestId },
      select: { id: true },
    },
  );
  // Build WHERE clause
  const where: Prisma.e_commerce_mall_cancellation_request_snapshotsWhereInput =
    {
      e_commerce_mall_cancellation_request_id: props.cancellationRequestId,
    };
  // Optional status filter
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  // Optional date range filter on created_at
  // Prisma accepts ISO 8601 strings in DateTime comparison filters (no Date objects needed)
  if (props.body.from !== undefined && props.body.to !== undefined) {
    where.created_at = {
      gte: props.body.from,
      lte: props.body.to,
    };
  } else if (props.body.from !== undefined) {
    where.created_at = {
      gte: props.body.from,
    };
  } else if (props.body.to !== undefined) {
    where.created_at = {
      lte: props.body.to,
    };
  }
  // Pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const limit: number =
    props.body.limit !== undefined
      ? Math.min(Math.max(props.body.limit, 1), 100)
      : 100;
  const skip: number = (page - 1) * limit;
  // Sequential await: findMany first, then count
  const records =
    await MyGlobal.prisma.e_commerce_mall_cancellation_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...ECommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      } satisfies Prisma.e_commerce_mall_cancellation_request_snapshotsFindManyArgs,
    );
  const total =
    await MyGlobal.prisma.e_commerce_mall_cancellation_request_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  } satisfies IPageIECommerceMallCancellationRequestSnapshot.ISummary;
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
// import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
// import { IPageIECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorCancellationRequestsCancellationRequestIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IECommerceMallCancellationRequestSnapshot.IRequest;
// }): Promise<IPageIECommerceMallCancellationRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_cancellation_request_snapshots.findMany({
//     ...ECommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------