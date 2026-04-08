import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerApprovalAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellersMeApprovals(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerApproval.IRequest;
}): Promise<IPageIEcommerceMallSellerApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;
  const whereInput = {
    ecommerce_mall_seller_id: props.seller.id,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.ecommerce_mall_seller_approvalsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take,
      ...EcommerceMallSellerApprovalAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_seller_approvals.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerApprovalAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellersMeApprovals(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerApproval.IRequest;
// }): Promise<IPageIEcommerceMallSellerApproval.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_approvals.findMany({
//     ...EcommerceMallSellerApprovalAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerApprovalAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------