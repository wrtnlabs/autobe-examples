import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformGuestAtSummaryTransformer } from "../transformers/HrmPlatformGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformGuests(props: {
  body: IHrmPlatformGuest.IRequest;
}): Promise<IPageIHrmPlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Build where filter
  const where: Prisma.hrm_platform_guestsWhereInput = {};
  // deleted_at filter
  if (props.body.deleted_at === true) {
    // Include all records regardless of soft-delete status
  } else {
    // Exclude soft-deleted records (default behavior)
    where.deleted_at = null;
  }
  // device_identifier pattern match
  if (props.body.device_identifier) {
    where.device_identifier = { contains: props.body.device_identifier };
  }
  // ip_address pattern match
  if (props.body.ip_address) {
    where.ip_address = { contains: props.body.ip_address };
  }
  // user_agent pattern match
  if (props.body.user_agent) {
    where.user_agent = { contains: props.body.user_agent };
  }
  // created_at date range filter
  if (props.body.created_at) {
    const created_at: Prisma.DateTimeFilter = {};
    if (props.body.created_at.gte) {
      created_at.gte = new Date(props.body.created_at.gte);
    }
    if (props.body.created_at.lte) {
      created_at.lte = new Date(props.body.created_at.lte);
    }
    where.created_at = created_at;
  }
  // updated_at date range filter
  if (props.body.updated_at) {
    const updated_at: Prisma.DateTimeFilter = {};
    if (props.body.updated_at.gte) {
      updated_at.gte = new Date(props.body.updated_at.gte);
    }
    if (props.body.updated_at.lte) {
      updated_at.lte = new Date(props.body.updated_at.lte);
    }
    where.updated_at = updated_at;
  }
  // Build orderBy
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const orderBy: Prisma.hrm_platform_guestsOrderByWithRelationInput = {
    [sortBy]: sortOrder === "ASC" ? "asc" : "desc",
  };
  // Calculate pagination
  const skip = (page - 1) * limit;
  // Execute findMany query
  const data = await MyGlobal.prisma.hrm_platform_guests.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...HrmPlatformGuestAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.hrm_platform_guests.count({
    where,
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
      HrmPlatformGuestAtSummaryTransformer.transform,
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
// import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
// import { IPageIHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformGuests(props: {
//   body: IHrmPlatformGuest.IRequest;
// }): Promise<IPageIHrmPlatformGuest.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_guests.findMany({
//     ...HrmPlatformGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------