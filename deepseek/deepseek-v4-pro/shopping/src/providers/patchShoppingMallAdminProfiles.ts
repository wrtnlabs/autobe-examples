import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProfiles(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerProfile.IRequest;
}): Promise<IPageIShoppingMallSellerProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const whereCondition = {
    seller: {
      approval_status: "approved",
      banned_at: null,
      deleted_at: null,
    },
    ...(search && search.length > 0
      ? { shop_name: { contains: search, mode: "insensitive" as const } }
      : {}),
  } satisfies Prisma.shopping_mall_seller_profilesWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_seller_profiles.findMany({
    where: whereCondition,
    ...ShoppingMallSellerProfileAtSummaryTransformer.select(),
    orderBy: { shop_name: { sort: "asc", nulls: "last" } },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_seller_profiles.count({
    where: whereCondition,
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
      ShoppingMallSellerProfileAtSummaryTransformer.transform,
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
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminProfiles(props: {
//   admin: AdminPayload;
//   body: IShoppingMallSellerProfile.IRequest;
// }): Promise<IPageIShoppingMallSellerProfile.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_seller_profiles.findMany({
//     ...ShoppingMallSellerProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallSellerProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------