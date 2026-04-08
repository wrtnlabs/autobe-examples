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

export async function patchEcommerceMallSellerOrderItemsOrderItemIdCancellationRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  // Verify seller owns this order item
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { ecommerce_mall_seller_id: true },
    });
  if (orderItem.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    order_item_id: props.orderItemId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.customerId && { customer_id: props.body.customerId }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && { gte: props.body.createdAtFrom }),
            ...(props.body.createdAtTo && { lte: props.body.createdAtTo }),
          },
        }
      : {}),
    ...(props.body.respondedAtFrom || props.body.respondedAtTo
      ? {
          responded_at: {
            ...(props.body.respondedAtFrom && {
              gte: props.body.respondedAtFrom,
            }),
            ...(props.body.respondedAtTo && { lte: props.body.respondedAtTo }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput = (
    props.body.sortBy === "status"
      ? { status: props.body.sortOrder ?? ("asc" as const) }
      : props.body.sortBy === "respondedAt"
        ? { responded_at: props.body.sortOrder ?? ("desc" as const) }
        : props.body.sortBy === "updatedAt"
          ? { updated_at: props.body.sortOrder ?? ("desc" as const) }
          : { created_at: props.body.sortOrder ?? ("desc" as const) }
  ) satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCancellationRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallCancellationRequest.ISummary;
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
// export async function patchEcommerceMallSellerOrderItemsOrderItemIdCancellationRequests(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
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