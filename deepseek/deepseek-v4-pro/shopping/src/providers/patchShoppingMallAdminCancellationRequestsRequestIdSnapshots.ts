import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCancellationRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
    where: { id: props.requestId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereClause: Prisma.shopping_mall_cancellation_request_snapshotsWhereInput =
    {
      shopping_mall_cancellation_request_id: props.requestId,
    };
  if (props.body.status !== undefined) {
    whereClause.status = props.body.status;
  }
  if (props.body.search !== undefined) {
    whereClause.reason = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    whereClause.created_at = {
      ...(props.body.created_at_from !== undefined
        ? { gte: props.body.created_at_from }
        : {}),
      ...(props.body.created_at_to !== undefined
        ? { lte: props.body.created_at_to }
        : {}),
    };
  }
  const sortDirection: Prisma.SortOrder =
    props.body.sort === "created_at_asc" ? "asc" : "desc";
  const orderBy = {
    created_at: sortDirection,
  } satisfies Prisma.shopping_mall_cancellation_request_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: whereClause,
        skip,
        take: limit,
        orderBy,
        ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereClause,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminCancellationRequestsRequestIdSnapshots(props: {
//   admin: AdminPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IShoppingMallCancellationRequestSnapshot.IRequest;
// }): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany({
//     ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------