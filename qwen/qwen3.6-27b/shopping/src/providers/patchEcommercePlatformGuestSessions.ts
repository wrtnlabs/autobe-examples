import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EcommercePlatformGuestSessionAtSummaryTransformer } from "../transformers/EcommercePlatformGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformGuestSessions(props: {
  guest: GuestPayload;
  body: IEcommercePlatformGuestSession.IRequest;
}): Promise<IPageIEcommercePlatformGuestSession.ISummary> {
  const page =
    props.body.page != null && props.body.page >= 1 ? props.body.page : 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: object = Object.assign(
    {},
    props.body.guest_id !== undefined && {
      ecommerce_platform_guest_id: props.body.guest_id,
    },
    props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    },
    props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    },
    props.body.ip !== undefined && { ip: props.body.ip },
    props.body.href !== undefined && { href: props.body.href },
    props.body.referrer !== undefined && { referrer: props.body.referrer },
  );
  const orderBy: object = Object.assign(
    props.body.sort_by !== undefined
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "asc" ? "asc" : "desc",
        }
      : {},
    {},
    props.body.sort_by === undefined && { created_at: "desc" },
  );
  const records =
    await MyGlobal.prisma.ecommerce_platform_guest_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommercePlatformGuestSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_platform_guest_sessions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformGuestSessionAtSummaryTransformer.transform,
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
// import { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
// import { IPageIEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformGuestSessions(props: {
//   guest: GuestPayload;
//   body: IEcommercePlatformGuestSession.IRequest;
// }): Promise<IPageIEcommercePlatformGuestSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_guest_sessions.findMany({
//     ...EcommercePlatformGuestSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformGuestSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------