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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.max(1, Math.min(props.body.limit ?? 20, 100));
  const skip = (page - 1) * limit;
  const dateFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.requestedAtFrom !== undefined) {
    dateFilter.gte = new Date(props.body.requestedAtFrom);
  }
  if (props.body.requestedAtTo !== undefined) {
    dateFilter.lte = new Date(props.body.requestedAtTo);
  }
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.orderItemId !== undefined && {
      order_item_id: props.body.orderItemId,
    }),
    ...(Object.keys(dateFilter).length > 0 && { requested_at: dateFilter }),
  };
  const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
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
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminRefundRequests(props: {
//   admin: AdminPayload;
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