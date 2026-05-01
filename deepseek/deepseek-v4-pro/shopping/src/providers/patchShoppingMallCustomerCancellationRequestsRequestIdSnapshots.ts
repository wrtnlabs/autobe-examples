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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancellationRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          orderItem: {
            select: {
              order: {
                select: {
                  shopping_mall_customer_id: true,
                },
              },
            },
          },
        },
      },
    );
  if (
    cancellationRequest.orderItem.order.shopping_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_cancellation_request_id: props.requestId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: props.body.created_at_to,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_cancellation_request_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_cancellation_request_snapshotsOrderByWithRelationInput;
  const records =
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
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerCancellationRequestsRequestIdSnapshots(props: {
//   customer: CustomerPayload;
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