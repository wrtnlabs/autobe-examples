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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSellersPending(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_sellersWhereInput = {
    approval_status: "pending",
    deleted_at: null,
    ...(props.body.search && {
      email: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.suspended !== undefined && {
      suspended: props.body.suspended,
    }),
    ...(props.body.banned !== undefined && {
      banned: props.body.banned,
    }),
    ...(props.body.shop_name && {
      sellerProfile: {
        shop_name: {
          contains: props.body.shop_name,
          mode: "insensitive",
        },
      },
    }),
  };
  const sortField = props.body.sort?.field ?? "created_at";
  const sortDirection = props.body.sort?.direction ?? "desc";
  const orderByInput: Prisma.shopping_mall_sellersOrderByWithRelationInput = {
    [sortField]: sortDirection,
  };
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallSellerAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: transformed,
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
// export async function patchShoppingMallAdministratorSellersPending(props: {
//   administrator: AdministratorPayload;
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