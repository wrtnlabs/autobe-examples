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
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomers(props: {
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_customersWhereInput = {
    deleted_at: null,
  };
  if (props.body.email !== undefined) {
    whereInput.email = {
      contains: props.body.email,
    };
  }
  if (props.body.banned !== undefined) {
    whereInput.banned = props.body.banned;
  }
  let gteDate: Date | undefined;
  let lteDate: Date | undefined;
  if (props.body.created_at_from !== undefined) {
    gteDate = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    lteDate = new Date(props.body.created_at_to);
  }
  if (gteDate !== undefined || lteDate !== undefined) {
    whereInput.created_at = {
      ...(gteDate !== undefined ? { gte: gteDate } : {}),
      ...(lteDate !== undefined ? { lte: lteDate } : {}),
    };
  }
  const orderByInput: Prisma.shopping_mall_customersOrderByWithRelationInput =
    props.body.sort_by === "email"
      ? { email: props.body.sort_order === "DESC" ? "desc" : "asc" }
      : props.body.sort_by === "banned"
        ? { banned: props.body.sort_order === "DESC" ? "desc" : "asc" }
        : { created_at: props.body.sort_order === "DESC" ? "desc" : "asc" };
  const records = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customers.count({
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
      records,
      ShoppingMallCustomerAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomers(props: {
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