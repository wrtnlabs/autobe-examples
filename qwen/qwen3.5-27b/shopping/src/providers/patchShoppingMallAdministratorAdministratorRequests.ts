import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorRequest.IRequest;
}): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
  // Verify super administrator privilege
  const admin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
        grade: "super",
      },
    });
  // Build where clause with optional filters
  const whereInput: Prisma.shopping_mall_administrator_requestsWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * pageSize;
  // Query records with transformer select
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findMany({
      where: whereInput,
      skip,
      take: pageSize,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdministratorRequestAtSummaryTransformer.select(),
    });
  // Count total records for pagination
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_requests.count({
      where: whereInput,
    });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallAdministratorRequestAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
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
// import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
// import { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministratorAdministratorRequests(props: {
//   administrator: AdministratorPayload;
//   body: IShoppingMallAdministratorRequest.IRequest;
// }): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_administrator_requests.findMany({
//     ...ShoppingMallAdministratorRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdministratorRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------