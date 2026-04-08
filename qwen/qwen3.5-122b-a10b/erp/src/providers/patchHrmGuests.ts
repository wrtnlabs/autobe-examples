import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmGuestAtSummaryTransformer } from "../transformers/HrmGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmGuests(props: {
  body: IHrmGuest.IRequest;
}): Promise<IPageIHrmGuest.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Validate pagination parameters
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Build where clause based on filters
  const whereInput: Prisma.hrm_guestsWhereInput = {
    // Date range filters
    ...(props.body.createdAfter && {
      created_at: {
        gte: new Date(props.body.createdAfter),
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lte: new Date(props.body.createdBefore),
      },
    }),
    // Device fingerprint search with ILIKE pattern matching
    ...(props.body.search && {
      device_fingerprint: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    // Soft delete filter based on deleted boolean
    ...(props.body.deleted !== undefined && {
      deleted_at: props.body.deleted ? { not: null } : null,
    }),
  } satisfies Prisma.hrm_guestsWhereInput;
  // Fetch paginated records
  const records = await MyGlobal.prisma.hrm_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmGuestAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.hrm_guests.count({
    where: whereInput,
  });
  // Transform records to response DTO
  const data = await ArrayUtil.asyncMap(
    records,
    HrmGuestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmGuest.ISummary;
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
// import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
// import { IPageIHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmGuests(props: {
//   body: IHrmGuest.IRequest;
// }): Promise<IPageIHrmGuest.ISummary> {
//   const records = await MyGlobal.prisma.hrm_guests.findMany({
//     ...HrmGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------