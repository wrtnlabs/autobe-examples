import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmAuthGuestJoin(props: {
  ip: string;
  body: IHrmGuest.IJoin;
}): Promise<IHrmGuest.IAuthorized> {
  // 1. Check for duplicate device fingerprint
  const existing = await MyGlobal.prisma.hrm_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
  });
  let guestId: string & tags.Format<"uuid">;
  if (existing) {
    guestId = existing.id as string & tags.Format<"uuid">;
  } else {
    // 2. Create new guest record
    const guest = await MyGlobal.prisma.hrm_guests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        device_fingerprint: props.body.device_fingerprint,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        deleted_at: null,
      },
    });
    guestId = guest.id as string & tags.Format<"uuid">;
  }
  // 3. Calculate expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 4. Create session record
  const session = await MyGlobal.prisma.hrm_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  // 6. Fetch guest with sessions for response
  const guest = await MyGlobal.prisma.hrm_guests.findUniqueOrThrow({
    where: { id: guestId },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sessions: {
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    },
  });
  // 7. Build response
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guest.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: guest.deleted_at
      ? (toISOStringSafe(guest.deleted_at) as string & tags.Format<"date-time">)
      : null,
    sessions: guest.sessions.map((s) => ({
      id: s.id as string & tags.Format<"uuid">,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(s.expired_at) as string &
        tags.Format<"date-time">,
      guest: {
        id: guest.id as string & tags.Format<"uuid">,
        device_fingerprint: guest.device_fingerprint,
        created_at: toISOStringSafe(guest.created_at) as string &
          tags.Format<"date-time">,
        sessions_count: guest.sessions.length,
      },
    })),
    token,
  } satisfies IHrmGuest.IAuthorized;
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
// import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmAuthGuestJoin(props: {
//   ip: string;
//   body: IHrmGuest.IJoin;
// }): Promise<IHrmGuest.IAuthorized> {
//   return {
//     id: ...,
//     device_fingerprint: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     sessions: await ArrayUtil.asyncMap(..., (r) => HrmGuestSessionAtSummaryTransformer.transform(r)),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------