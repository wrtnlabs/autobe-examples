import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministrators(props: {
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  const body = props.body;
  // Build where clause
  const whereInput: Prisma.shopping_mall_administratorsWhereInput = {
    deleted_at: null,
  };
  // Add search filter (partial match on email)
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    whereInput.email = {
      contains: body.search,
      mode: "insensitive",
    };
  }
  // Add grade filter
  if (body.grade !== undefined && body.grade !== null) {
    whereInput.grade = body.grade;
  }
  // Add status filter (map 'active'/'banned' to banned boolean)
  if (body.status !== undefined && body.status !== null) {
    if (body.status === "active") {
      whereInput.banned = false;
    } else if (body.status === "banned") {
      whereInput.banned = true;
    }
  }
  // Handle pagination
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  // Fetch data with pagination
  const records = await MyGlobal.prisma.shopping_mall_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdministratorAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_administrators.count({
    where: whereInput,
  });
  // Transform records to DTO
  const data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallAdministratorAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
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
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministrators(props: {
//   body: IShoppingMallAdministrator.IRequest;
// }): Promise<IPageIShoppingMallAdministrator.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_administrators.findMany({
//     ...ShoppingMallAdministratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdministratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------