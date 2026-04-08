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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItemsOrderItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  // Verify customer owns this order item
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 403);
  }
  // Apply filters from request body
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build created_at date range filter
  const createdAtFilter:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== undefined && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  // Build responded_at date range filter
  const respondedAtFilter:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.respondedAtFrom !== undefined ||
    props.body.respondedAtTo !== undefined
      ? {
          ...(props.body.respondedAtFrom !== undefined && {
            gte: new Date(props.body.respondedAtFrom),
          }),
          ...(props.body.respondedAtTo !== undefined && {
            lte: new Date(props.body.respondedAtTo),
          }),
        }
      : undefined;
  const whereInput = {
    order_item_id: props.orderItemId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(respondedAtFilter !== undefined && { responded_at: respondedAtFilter }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  // Build orderBy based on sort parameters
  const sortField = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = (
    sortField === "createdAt"
      ? { created_at: sortOrder }
      : sortField === "updatedAt"
        ? { updated_at: sortOrder }
        : sortField === "status"
          ? { status: sortOrder }
          : { created_at: sortOrder }
  ) satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  // Sequential queries (NOT Promise.all)
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
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
// export async function patchEcommerceMallCustomerOrderItemsOrderItemIdCancellationRequests(props: {
//   customer: CustomerPayload;
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