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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotionRequests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reviewed !== null && {
      reviewer_id: props.body.reviewed ? { not: null } : null,
    }),
    ...(props.body.requesterType !== null && {
      ...(props.body.requesterType === "customer"
        ? { customerSubtype: { some: {} } }
        : { sellerRequest: { some: {} } }),
    }),
  };
  const sortOrder = props.body.sortOrder ?? "desc";
  const sortBy = props.body.sortBy ?? "createdAt";
  const orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput =
    sortBy === "createdAt"
      ? { created_at: sortOrder }
      : sortBy === "status"
        ? { status: sortOrder }
        : { updated_at: sortOrder };
  const findManyArgs: Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs =
    {
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      ...EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
    };
  if (props.body.cursor !== null) {
    findManyArgs.cursor = { id: props.body.cursor };
    findManyArgs.skip = 1;
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany(
      findManyArgs,
    ),
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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
// export async function patchEcommerceMallSuperAdminAdminPromotionRequests(props: {
//   superAdmin: SuperadminPayload;
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