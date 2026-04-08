import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformSellerAccountAtSummaryTransformer } from "../transformers/MallPlatformSellerAccountAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellerAccounts(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSellerAccount.IRequest;
}): Promise<IPageIMallPlatformSellerAccount.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const search: string | undefined = props.body.search;
  const approvalStatus: string | undefined = props.body.approvalStatus;
  const sort: string = props.body.sort ?? "createdAt_desc";
  if (
    approvalStatus !== undefined &&
    approvalStatus !== "pending" &&
    approvalStatus !== "approved" &&
    approvalStatus !== "rejected"
  ) {
    throw new HttpException("Unsupported approvalStatus filter.", 400);
  }
  let orderBy: Prisma.mall_platform_seller_accountsOrderByWithRelationInput;
  if (sort === "email_asc") orderBy = { email: "asc" };
  else if (sort === "email_desc") orderBy = { email: "desc" };
  else if (sort === "approvalStatus_asc") orderBy = { approval_status: "asc" };
  else if (sort === "approvalStatus_desc")
    orderBy = { approval_status: "desc" };
  else if (sort === "createdAt_asc") orderBy = { created_at: "asc" };
  else if (sort === "createdAt_desc") orderBy = { created_at: "desc" };
  else throw new HttpException("Unsupported sort key.", 400);
  const where: Prisma.mall_platform_seller_accountsWhereInput = {
    deleted_at: null,
    ...(search !== undefined && search !== ""
      ? {
          email: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(approvalStatus !== undefined
      ? { approval_status: approvalStatus }
      : {}),
  };
  const records = await MyGlobal.prisma.mall_platform_seller_accounts.count({
    where,
  });
  const skip: number = (page - 1) * limit;
  const pages: number = limit === 0 ? 0 : Math.ceil(records / limit);
  const rows =
    skip >= records
      ? []
      : await MyGlobal.prisma.mall_platform_seller_accounts.findMany({
          ...MallPlatformSellerAccountAtSummaryTransformer.select(),
          where,
          orderBy,
          skip,
          take: limit,
        });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    },
    data: await ArrayUtil.asyncMap(
      rows,
      MallPlatformSellerAccountAtSummaryTransformer.transform,
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorSellerAccounts(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformSellerAccount.IRequest;
// }): Promise<IPageIMallPlatformSellerAccount.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_seller_accounts.findMany({
//     ...MallPlatformSellerAccountAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformSellerAccountAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------