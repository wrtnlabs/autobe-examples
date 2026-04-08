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

export async function patchEcommerceMallAdministratorSellersPending(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerApprovalRequest.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    status: "pending",
    ...(props.body.created_at_gte && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
    ...(props.body.seller_id && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.reviewer_id && {
      reviewer_id: props.body.reviewer_id,
    }),
  };
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy:
        props.body.sort_by === "created_at"
          ? { created_at: (props.body.order ?? "desc") as "asc" | "desc" }
          : props.body.sort_by === "updated_at"
            ? { updated_at: (props.body.order ?? "desc") as "asc" | "desc" }
            : props.body.sort_by === "status"
              ? { status: (props.body.order ?? "desc") as "asc" | "desc" }
              : props.body.sort_by === "reviewer_id"
                ? {
                    reviewer_id: (props.body.order ?? "desc") as "asc" | "desc",
                  }
                : { created_at: "desc" as const },
      ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// export async function patchEcommerceMallAdministratorSellersPending(props: {
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