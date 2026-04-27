import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallRefundRequestAtSummaryTransformer } from "../transformers/ECommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorRefundRequests(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallRefundRequest.IRequest;
}): Promise<IPageIECommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    where.reason = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.status) {
    if (Array.isArray(props.body.status)) {
      where.status = { in: props.body.status };
    } else {
      where.status = props.body.status;
    }
  }
  if (props.body.fromCreatedAt || props.body.toCreatedAt) {
    const created_at: Prisma.DateTimeFilter = {};
    if (props.body.fromCreatedAt) {
      created_at.gte = new Date(props.body.fromCreatedAt);
    }
    if (props.body.toCreatedAt) {
      created_at.lte = new Date(props.body.toCreatedAt);
    }
    where.created_at = created_at;
  }
  if (props.body.customerId) {
    where.e_commerce_mall_customer_id = props.body.customerId;
  }
  if (props.body.sellerId) {
    where.e_commerce_mall_seller_id = props.body.sellerId;
  }
  if (props.body.orderItemId) {
    where.e_commerce_mall_order_item_id = props.body.orderItemId;
  }
  const orderBy: Prisma.e_commerce_mall_refund_requestsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  if (props.body.sort === "status") {
    orderBy.status = "desc";
  } else if (props.body.sort === "response_timestamp") {
    orderBy.response_timestamp = "desc";
  }
  const data = await MyGlobal.prisma.e_commerce_mall_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ECommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.e_commerce_mall_refund_requests.count({
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
      data,
      ECommerceMallRefundRequestAtSummaryTransformer.transform,
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
// import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
// import { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorRefundRequests(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallRefundRequest.IRequest;
// }): Promise<IPageIECommerceMallRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_refund_requests.findMany({
//     ...ECommerceMallRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------