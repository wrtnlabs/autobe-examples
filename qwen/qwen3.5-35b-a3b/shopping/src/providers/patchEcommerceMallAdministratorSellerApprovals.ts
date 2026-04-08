import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorSellerApprovals(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerApprovalRequest.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && props.body.status.length > 0
      ? { status: { in: props.body.status } }
      : {}),
    ...(props.body.seller_id ? { seller_id: props.body.seller_id } : {}),
    ...(props.body.reviewer_id ? { reviewer_id: props.body.reviewer_id } : {}),
    ...(props.body.search
      ? {
          seller: {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        }
      : {}),
    ...(props.body.created_at_gte
      ? { created_at: { gte: new Date(props.body.created_at_gte) } }
      : {}),
    ...(props.body.created_at_lte
      ? { created_at: { lte: new Date(props.body.created_at_lte) } }
      : {}),
    ...(props.body.updated_at_gte
      ? { updated_at: { gte: new Date(props.body.updated_at_gte) } }
      : {}),
    ...(props.body.updated_at_lte
      ? { updated_at: { lte: new Date(props.body.updated_at_lte) } }
      : {}),
  } satisfies Prisma.ecommerce_mall_seller_approval_requestsWhereInput;
  const orderByInput = (() => {
    const sort = props.body.sort_by ?? "created_at";
    const order: "asc" | "desc" = props.body.order ?? "desc";
    return { [sort]: order };
  })() satisfies Prisma.ecommerce_mall_seller_approval_requestsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_approval_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorSellerApprovals(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallSellerApprovalRequest.IRequest;
// }): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
//     ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------