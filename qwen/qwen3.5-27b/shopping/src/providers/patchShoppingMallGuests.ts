import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallGuestAtSummaryTransformer } from "../transformers/ShoppingMallGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuests(props: {
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_guestsWhereInput = {};
  if (props.body.device_fingerprint !== undefined) {
    whereInput.device_fingerprint = {
      contains: props.body.device_fingerprint,
    };
  }
  if (
    props.body.created_at_gte !== undefined ||
    props.body.created_at_lte !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_gte !== undefined) {
      createdAtFilter.gte = new Date(props.body.created_at_gte);
    }
    if (props.body.created_at_lte !== undefined) {
      createdAtFilter.lte = new Date(props.body.created_at_lte);
    }
    whereInput.created_at = createdAtFilter;
  }
  if (props.body.deleted_at !== undefined) {
    whereInput.deleted_at = props.body.deleted_at ? { not: null } : null;
  }
  const orderByInput: Prisma.shopping_mall_guestsOrderByWithRelationInput = {
    ...(props.body.sort !== undefined
      ? { [props.body.sort]: props.body.order ?? "desc" }
      : { created_at: "desc" }),
  };
  const data = await MyGlobal.prisma.shopping_mall_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_guests.count({
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
      data,
      ShoppingMallGuestAtSummaryTransformer.transform,
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
// import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
// import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallGuests(props: {
//   body: IShoppingMallGuest.IRequest;
// }): Promise<IPageIShoppingMallGuest.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_guests.findMany({
//     ...ShoppingMallGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------