import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
  };
  if (props.body.approval_status !== undefined) {
    where.approval_status = props.body.approval_status;
  }
  if (props.body.suspended !== undefined && props.body.suspended !== null) {
    if (props.body.suspended) {
      where.suspended_at = { not: null };
    } else {
      where.suspended_at = null;
    }
  }
  if (props.body.banned !== undefined && props.body.banned !== null) {
    if (props.body.banned) {
      where.banned_at = { not: null };
    } else {
      where.banned_at = null;
    }
  }
  if (props.body.email !== undefined) {
    where.email = { contains: props.body.email, mode: "insensitive" };
  }
  const orderBy: Prisma.shopping_mall_sellersOrderByWithRelationInput = {
    created_at: "desc",
  };
  const records = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallSellerAtSummaryTransformer.transform,
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
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminSellers(props: {
//   admin: AdminPayload;
//   body: IShoppingMallSeller.IRequest;
// }): Promise<IPageIShoppingMallSeller.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_sellers.findMany({
//     ...ShoppingMallSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------