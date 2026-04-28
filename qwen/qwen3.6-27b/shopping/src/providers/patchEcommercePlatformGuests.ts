import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformGuestAtSummaryTransformer } from "../transformers/EcommercePlatformGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformGuests(props: {
  body: IEcommercePlatformGuest.IRequest;
}): Promise<IPageIEcommercePlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = Object.assign(
    {} as Prisma.ecommerce_platform_guestsWhereInput,
    ...(props.body.deviceFingerprint !== undefined
      ? [{ device_fingerprint: props.body.deviceFingerprint }]
      : []),
    ...(props.body.search !== undefined
      ? [{ device_fingerprint: { contains: props.body.search } }]
      : []),
    ...(props.body.isDeleted === true ? [{ NOT: { deleted_at: null } }] : []),
    ...(props.body.isDeleted === false ? [{ deleted_at: null }] : []),
    ...(props.body.createdAtFrom !== undefined
      ? [{ created_at: { gte: new Date(props.body.createdAtFrom) } }]
      : []),
    ...(props.body.createdAtTo !== undefined
      ? [{ created_at: { lte: new Date(props.body.createdAtTo) } }]
      : []),
    ...(props.body.updatedAtFrom !== undefined
      ? [{ updated_at: { gte: new Date(props.body.updatedAtFrom) } }]
      : []),
    ...(props.body.updatedAtTo !== undefined
      ? [{ updated_at: { lte: new Date(props.body.updatedAtTo) } }]
      : []),
  ) satisfies Prisma.ecommerce_platform_guestsWhereInput;
  const records = await MyGlobal.prisma.ecommerce_platform_guests.findMany({
    where: whereInput,
    ...EcommercePlatformGuestAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.ecommerce_platform_guests.count({
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
      EcommercePlatformGuestAtSummaryTransformer.transform,
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
// import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
// import { IPageIEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformGuests(props: {
//   body: IEcommercePlatformGuest.IRequest;
// }): Promise<IPageIEcommercePlatformGuest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_guests.findMany({
//     ...EcommercePlatformGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------