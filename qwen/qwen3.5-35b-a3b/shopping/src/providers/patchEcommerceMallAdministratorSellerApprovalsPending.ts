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

export async function patchEcommerceMallAdministratorSellerApprovalsPending(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerApprovalRequest.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_approval_requestsWhereInput = {
    status: "pending",
    deleted_at: null,
    ...(props.body.created_at_gte && {
      created_at: { gte: props.body.created_at_gte },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: props.body.created_at_lte },
    }),
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.reviewer_id && { reviewer_id: props.body.reviewer_id }),
    ...(props.body.search && {
      OR: [
        {
          seller: {
            email: { contains: props.body.search, mode: "insensitive" },
          },
        },
        {
          seller: {
            display_name: { contains: props.body.search, mode: "insensitive" },
          },
        },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_seller_approval_requestsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_seller_approval_requestsOrderByWithRelationInput =
    props.body.sort_by === "updated_at"
      ? {
          updated_at:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        }
      : props.body.sort_by === "status"
        ? {
            status:
              props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
          }
        : props.body.sort_by === "reviewer_id"
          ? {
              reviewer_id:
                props.body.order === "asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            }
          : { created_at: "desc" as const };
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallSellerApprovalRequest.ISummary;
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
// export async function patchEcommerceMallAdministratorSellerApprovalsPending(props: {
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