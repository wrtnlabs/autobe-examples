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
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_platform_guestsWhereInput = {
    deleted_at: props.body.deleted_at === true ? undefined : null,
    ...(props.body.device_identifier && {
      device_identifier: { equals: props.body.device_identifier },
    }),
    ...(props.body.ip_address && {
      ip_address: { equals: props.body.ip_address },
    }),
    ...(props.body.user_agent && {
      user_agent: { contains: props.body.user_agent, mode: "insensitive" },
    }),
    ...(props.body.created_at && {
      created_at: {
        ...(props.body.created_at.gte && {
          gte: new Date(props.body.created_at.gte),
        }),
        ...(props.body.created_at.lte && {
          lte: new Date(props.body.created_at.lte),
        }),
      },
    }),
    ...(props.body.updated_at && {
      updated_at: {
        ...(props.body.updated_at.gte && {
          gte: new Date(props.body.updated_at.gte),
        }),
        ...(props.body.updated_at.lte && {
          lte: new Date(props.body.updated_at.lte),
        }),
      },
    }),
  } satisfies Prisma.hrm_platform_guestsWhereInput;
  const orderBy = (
    props.body.sortBy === "ip_address"
      ? { ip_address: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
      : props.body.sortBy === "device_identifier"
        ? {
            device_identifier: (props.body.sortOrder ?? "desc") as
              | "asc"
              | "desc",
          }
        : { created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.hrm_platform_guestsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmPlatformGuestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_guests.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformGuestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformGuest.ISummary;
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