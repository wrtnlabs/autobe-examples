import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
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
import { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/ECommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerCancellationRequests(props: {
  seller: SellerPayload;
  body: IECommerceMallCancellationRequest.IRequest;
}): Promise<IPageIECommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    orderItem: {
      productVariant: {
        product: {
          seller_id: props.seller.id,
        },
      },
    },
  };
  if (props.body.search !== undefined) {
    where.reason = { contains: props.body.search };
  }
  if (props.body.status !== undefined && props.body.status.length > 0) {
    where.status = { in: props.body.status };
  }
  if (props.body.customer_id !== undefined) {
    where.e_commerce_mall_customer_id = props.body.customer_id;
  }
  if (props.body.seller_id !== undefined) {
    where.e_commerce_mall_seller_id = props.body.seller_id;
  }
  if (props.body.order_item_id !== undefined) {
    where.e_commerce_mall_order_item_id = props.body.order_item_id;
  }
  const created_at_filter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from !== undefined) {
    created_at_filter.gte = props.body.created_at_from;
  }
  if (props.body.created_at_to !== undefined) {
    created_at_filter.lte = props.body.created_at_to;
  }
  if (Object.keys(created_at_filter).length > 0) {
    where.created_at = created_at_filter;
  }
  const orderBy: Prisma.e_commerce_mall_cancellation_requestsOrderByWithRelationInput =
    {};
  if (props.body.sort === "status") {
    orderBy.status = "asc";
  } else {
    orderBy.created_at = "desc";
  }
  const records =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ECommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallCancellationRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallCancellationRequest.ISummary;
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
// import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
// import { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
// export async function patchECommerceMallSellerCancellationRequests(props: {
//   seller: SellerPayload;
//   body: IECommerceMallCancellationRequest.IRequest;
// }): Promise<IPageIECommerceMallCancellationRequest.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findMany({
//     ...ECommerceMallCancellationRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallCancellationRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------