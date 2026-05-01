import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    ...(body.search
      ? {
          OR: [
            { email: { contains: body.search } },
            { display_name: { contains: body.search } },
          ],
        }
      : {}),
    ...(body.ban_status === "banned" ? { banned_at: { not: null } } : {}),
    ...(body.ban_status === "active" ? { banned_at: null } : {}),
    ...(body.created_from ? { created_at: { gte: body.created_from } } : {}),
    ...(body.created_to ? { created_at: { lte: body.created_to } } : {}),
    ...(body.include_deleted ? {} : { deleted_at: null }),
  } satisfies Prisma.shopping_mall_customersWhereInput;
  const records = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallCustomerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallCustomer.ISummary;
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
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminCustomers(props: {
//   admin: AdminPayload;
//   body: IShoppingMallCustomer.IRequest;
// }): Promise<IPageIShoppingMallCustomer.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customers.findMany({
//     ...ShoppingMallCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------