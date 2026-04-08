import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerAdminPromotionRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  const limit = Math.min(props.body.limit ?? 20, 100);
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reviewed !== null && {
      reviewer_id: props.body.reviewed ? { not: null } : null,
    }),
    ...(props.body.requesterType === "seller" && {
      sellerRequest: { isNot: null },
    }),
    ...(props.body.requesterType === "customer" && {
      customerSubtype: { isNot: null },
    }),
  };
  let orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput;
  if (props.body.sortBy === "reviewedAt") {
    orderBy = { updated_at: props.body.sortOrder ?? "desc" };
  } else if (props.body.sortBy === "status") {
    orderBy = { status: props.body.sortOrder ?? "asc" };
  } else {
    orderBy = { created_at: props.body.sortOrder ?? "desc" };
  }
  const findManyArgs: Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs =
    {
      where,
      take: limit,
      orderBy,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    };
  if (props.body.cursor !== null) {
    findManyArgs.skip = 1;
    findManyArgs.cursor = { id: props.body.cursor };
  } else {
    const page = props.body.page ?? 1;
    findManyArgs.skip = (page - 1) * limit;
  }
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany(
      findManyArgs,
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where,
    });
  const currentPage = props.body.cursor !== null ? 1 : (props.body.page ?? 1);
  return {
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
// import { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerAdminPromotionRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallAdminPromotionRequest.IRequest;
// }): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
//     ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------