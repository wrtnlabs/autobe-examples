import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerCancellationRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    seller_id: props.seller.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.orderItemId && { order_item_id: props.body.orderItemId }),
    ...(props.body.customerId && { customer_id: props.body.customerId }),
    ...(props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: {
          gte: props.body.createdAtFrom,
          lte: props.body.createdAtTo,
        },
      }),
    ...(props.body.createdAtFrom &&
      !props.body.createdAtTo && {
        created_at: { gte: props.body.createdAtFrom },
      }),
    ...(!props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: { lte: props.body.createdAtTo },
      }),
    ...(props.body.respondedAtFrom &&
      props.body.respondedAtTo && {
        responded_at: {
          gte: props.body.respondedAtFrom,
          lte: props.body.respondedAtTo,
        },
      }),
    ...(props.body.respondedAtFrom &&
      !props.body.respondedAtTo && {
        responded_at: { gte: props.body.respondedAtFrom },
      }),
    ...(!props.body.respondedAtFrom &&
      props.body.respondedAtTo && {
        responded_at: { lte: props.body.respondedAtTo },
      }),
    ...(props.body.search && {
      OR: [
        { reason: { contains: props.body.search } },
        { response_reason: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput =
    props.body.sortBy === "createdAt"
      ? {
          created_at:
            props.body.sortOrder === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : props.body.sortBy === "updatedAt"
        ? {
            updated_at:
              props.body.sortOrder === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          }
        : props.body.sortBy === "status"
          ? {
              status:
                props.body.sortOrder === "asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            }
          : { created_at: "desc" as const };
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCancellationRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerCancellationRequests(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallCancellationRequest.IRequest;
// }): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
//     ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCancellationRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------