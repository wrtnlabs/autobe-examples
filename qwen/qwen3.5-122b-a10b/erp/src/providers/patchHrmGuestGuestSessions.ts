import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmGuestSessionAtSummaryTransformer } from "../transformers/HrmGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmGuestSession.IRequest;
}): Promise<IPageIHrmGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 10), 100);
  const skip = (page - 1) * limit;
  const now = new Date().toISOString();
  const whereInput = {
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.expired_at_from && {
      expired_at: { gte: props.body.expired_at_from },
    }),
    ...(props.body.expired_at_to && {
      expired_at: { lte: props.body.expired_at_to },
    }),
    ...(props.body.is_expired !== undefined && {
      expired_at: props.body.is_expired ? { lt: now } : { gte: now },
    }),
    ...(props.body.device_fingerprint && {
      guest: {
        device_fingerprint: props.body.device_fingerprint,
      },
    }),
  } satisfies Prisma.hrm_guest_sessionsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_guest_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmGuestSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_guest_sessions.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmGuestSessionAtSummaryTransformer.transform,
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
// import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
// import { IPageIHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmGuestGuestSessions(props: {
//   guest: GuestPayload;
//   body: IHrmGuestSession.IRequest;
// }): Promise<IPageIHrmGuestSession.ISummary> {
//   const records = await MyGlobal.prisma.hrm_guest_sessions.findMany({
//     ...HrmGuestSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmGuestSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------