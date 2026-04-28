import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformRefundRequestAtSummaryTransformer } from "../transformers/EcommercePlatformRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformRefundRequest.IRequest;
}): Promise<IPageIEcommercePlatformRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_platform_refund_requestsWhereInput = {
    orderItem: {
      order: {
        customerProfile: {
          id: props.customer.id,
        },
      },
    },
  };
  if (props.body.status !== undefined) where.status = props.body.status;
  if (props.body.sellerProfileId !== undefined)
    where.seller_profile_id = props.body.sellerProfileId;
  if (
    props.body.createdAtStart !== undefined ||
    props.body.createdAtEnd !== undefined
  ) {
    const range: Record<string, unknown> = {};
    if (props.body.createdAtStart !== undefined)
      range.gte = new Date(props.body.createdAtStart);
    if (props.body.createdAtEnd !== undefined)
      range.lte = new Date(props.body.createdAtEnd);
    where.created_at = range;
  }
  if (
    props.body.respondedAtStart !== undefined ||
    props.body.respondedAtEnd !== undefined
  ) {
    const range: Record<string, unknown> = {};
    if (props.body.respondedAtStart !== undefined)
      range.gte = new Date(props.body.respondedAtStart);
    if (props.body.respondedAtEnd !== undefined)
      range.lte = new Date(props.body.respondedAtEnd);
    where.responded_at = range;
  }
  if (props.body.search !== undefined)
    where.refund_reason = { contains: props.body.search };
  const records =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformRefundRequestAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_platform_refund_requests.count({
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
      EcommercePlatformRefundRequestAtSummaryTransformer.transform,
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
// import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
// import { IPageIEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformRefundRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerRefundRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformRefundRequest.IRequest;
// }): Promise<IPageIEcommercePlatformRefundRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_refund_requests.findMany({
//     ...EcommercePlatformRefundRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformRefundRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------