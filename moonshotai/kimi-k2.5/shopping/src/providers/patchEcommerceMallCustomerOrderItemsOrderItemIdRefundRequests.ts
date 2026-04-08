import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItemsOrderItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const requestedAtFilter: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.requestedAtFrom !== undefined) {
    requestedAtFilter.gte = props.body.requestedAtFrom;
  }
  if (props.body.requestedAtTo !== undefined) {
    requestedAtFilter.lte = props.body.requestedAtTo;
  }
  const hasDateFilter: boolean =
    props.body.requestedAtFrom !== undefined ||
    props.body.requestedAtTo !== undefined;
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    order_item_id: props.orderItemId,
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(hasDateFilter && { requested_at: requestedAtFilter }),
  };
  const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { requested_at: "desc" },
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    },
  );
  const total: number =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: whereInput,
    });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const transformedData: IEcommerceMallRefundRequest.ISummary[] =
    await ArrayUtil.asyncMap(
      records,
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
    );
  return {
    pagination,
    data: transformedData,
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerOrderItemsOrderItemIdRefundRequests(props: {
//   customer: CustomerPayload;
//   orderItemId: string;
//   body: IEcommerceMallRefundRequest.IRequest;
// }): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
//     ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------