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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallGuestAtSummaryTransformer } from "../transformers/ShoppingMallGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminGuests(props: {
  admin: AdminPayload;
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at_desc";
  const orderByInput = (
    sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : sort === "updated_at_asc"
        ? { updated_at: "asc" as const }
        : sort === "updated_at_desc"
          ? { updated_at: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_guestsOrderByWithRelationInput;
  const whereInput = {
    ...(props.body.device_fingerprint !== undefined && {
      device_fingerprint: { contains: props.body.device_fingerprint },
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: props.body.created_at_to,
        }),
      },
    }),
    ...((props.body.updated_at_from !== undefined ||
      props.body.updated_at_to !== undefined) && {
      updated_at: {
        ...(props.body.updated_at_from !== undefined && {
          gte: props.body.updated_at_from,
        }),
        ...(props.body.updated_at_to !== undefined && {
          lte: props.body.updated_at_to,
        }),
      },
    }),
    ...(props.body.active_only === true && {
      deleted_at: null,
    }),
  } satisfies Prisma.shopping_mall_guestsWhereInput;
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
      limit,
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
// export async function patchShoppingMallAdminGuests(props: {
//   admin: AdminPayload;
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