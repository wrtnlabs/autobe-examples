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
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellers(props: {
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
  };
  // Apply search filters
  if (props.body.search !== undefined) {
    whereInput.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.approval_status !== undefined) {
    whereInput.approval_status = props.body.approval_status;
  }
  if (props.body.suspended !== undefined) {
    whereInput.suspended = props.body.suspended;
  }
  if (props.body.banned !== undefined) {
    whereInput.banned = props.body.banned;
  }
  // Apply shop_name search via sellerProfile relation
  if (props.body.shop_name !== undefined) {
    whereInput.sellerProfile = {
      shop_name: {
        contains: props.body.shop_name,
        mode: "insensitive",
      },
    };
  }
  // Build orderBy clause
  const sortField = props.body.sort?.field ?? "created_at";
  const sortDirection = props.body.sort?.direction ?? "desc";
  const orderByInput: Prisma.shopping_mall_sellersOrderByWithRelationInput = {
    ...(sortField === "created_at" && {
      created_at: sortDirection as "asc" | "desc",
    }),
    ...(sortField === "approval_status" && {
      approval_status: sortDirection as "asc" | "desc",
    }),
    ...(sortField === "email" && { email: sortDirection as "asc" | "desc" }),
    ...(sortField === "shop_name" && {
      sellerProfile: { shop_name: sortDirection as "asc" | "desc" },
    }),
  };
  // Query data
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallSellerAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
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
// export async function patchShoppingMallSellers(props: {
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