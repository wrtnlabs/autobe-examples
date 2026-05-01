import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCancellationRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && props.body.status !== ""
      ? { status: props.body.status }
      : {}),
    ...(props.body.orderItemId !== undefined
      ? { shopping_mall_order_item_id: props.body.orderItemId }
      : {}),
    ...(props.body.search !== undefined && props.body.search !== ""
      ? { reason: { contains: props.body.search } }
      : {}),
    ...(props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdFrom !== undefined
              ? { gte: props.body.createdFrom }
              : {}),
            ...(props.body.createdTo !== undefined
              ? { lte: props.body.createdTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const direction: "asc" | "desc" =
    props.body.sortDirection === "asc" ? "asc" : "desc";
  const orderByInput = (
    props.body.sortBy === "status"
      ? { status: direction }
      : { created_at: direction }
  ) satisfies Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestAtSummaryTransformer.transform,
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
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminCancellationRequests(props: {
//   admin: AdminPayload;
//   body: IShoppingMallCancellationRequest.IRequest;
// }): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
//     ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCancellationRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------