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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequest.ISummary> {
  // Verify super administrator authorization
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.seller.id },
    select: { grade: true },
  });
  if (admin === null || admin.grade !== "super_admin") {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause with filters
  const whereInput: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reviewed !== null && {
      reviewer_id: props.body.reviewed ? { not: null } : null,
    }),
  };
  // Handle requester type filter through polymorphic relations
  let where: Prisma.ecommerce_mall_admin_promotion_requestsWhereInput =
    whereInput;
  if (props.body.requesterType !== null) {
    if (props.body.requesterType === "customer") {
      where = {
        ...whereInput,
        customerSubtype: { some: {} },
        sellerRequest: { none: {} },
      };
    } else if (props.body.requesterType === "seller") {
      where = {
        ...whereInput,
        sellerRequest: { some: {} },
        customerSubtype: { none: {} },
      };
    }
  }
  // Build order by clause
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.ecommerce_mall_admin_promotion_requestsOrderByWithRelationInput =
    sortBy === "reviewedAt"
      ? { updated_at: sortOrder }
      : sortBy === "status"
        ? { status: sortOrder }
        : { created_at: sortOrder };
  const selectArgs =
    EcommerceMallAdminPromotionRequestAtSummaryTransformer.select();
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...selectArgs,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.count({
      where,
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
// export async function patchEcommerceMallSellerAdminPromotionRequests(props: {
//   seller: SellerPayload;
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