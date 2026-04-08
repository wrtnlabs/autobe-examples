import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthGuestJoin(props: {
  ip: string;
  body: IHrmPlatformGuest.IJoin;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  const nowTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpiresTimestamp: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiresTimestamp: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const deviceIdentifier: string & tags.Format<"uuid"> = v4();
  const existingGuest = await MyGlobal.prisma.hrm_platform_guests.findFirst({
    where: {
      device_identifier: deviceIdentifier,
      deleted_at: null,
    },
  });
  if (existingGuest) {
    const existingSession =
      await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
        where: {
          hrm_platform_guest_id: existingGuest.id,
          expired_at: { gt: new Date(accessExpiresTimestamp) },
        },
      });
    let sessionId: (string & tags.Format<"uuid">) | null =
      existingSession?.id ?? null;
    if (!sessionId) {
      const newSessionId: string & tags.Format<"uuid"> = v4();
      sessionId = newSessionId;
      await MyGlobal.prisma.hrm_platform_guest_sessions.create({
        data: {
          id: newSessionId,
          hrm_platform_guest_id: existingGuest.id,
          session_token: await generateSessionToken({
            guestId: existingGuest.id,
            sessionId: newSessionId,
          }),
          ip: props.ip,
          href: props.body.href,
          referrer: props.body.referrer ?? null,
          created_at: new Date(nowTimestamp),
          expired_at: new Date(accessExpiresTimestamp),
        },
      });
    }
    const token: IAuthorizationToken = await generateGuestTokens({
      guestId: existingGuest.id,
      sessionId: sessionId,
    });
    return {
      id: existingGuest.id,
      device_identifier: existingGuest.device_identifier,
      ip_address: existingGuest.ip_address,
      user_agent: existingGuest.user_agent,
      created_at: toISOStringSafe(existingGuest.created_at),
      updated_at: toISOStringSafe(existingGuest.updated_at),
      deleted_at:
        existingGuest.deleted_at != null
          ? toISOStringSafe(existingGuest.deleted_at)
          : null,
      token,
      session_id: sessionId,
      organization_id: null,
    } satisfies IHrmPlatformGuest.IAuthorized;
  }
  const guestId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const guest = await MyGlobal.prisma.hrm_platform_guests.create({
    data: {
      id: guestId,
      device_identifier: deviceIdentifier,
      ip_address: props.ip,
      user_agent: "unknown",
      created_at: new Date(nowTimestamp),
      updated_at: new Date(nowTimestamp),
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: sessionId,
      hrm_platform_guest_id: guestId,
      session_token: await generateSessionToken({
        guestId,
        sessionId,
      }),
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: new Date(nowTimestamp),
      expired_at: new Date(accessExpiresTimestamp),
    },
  });
  const token: IAuthorizationToken = await generateGuestTokens({
    guestId,
    sessionId,
  });
  return {
    id: guestId,
    device_identifier: guest.device_identifier,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at != null ? toISOStringSafe(guest.deleted_at) : null,
    token,
    session_id: sessionId,
    organization_id: null,
  } satisfies IHrmPlatformGuest.IAuthorized;
}
async function generateGuestTokens(props: {
  guestId: string & tags.Format<"uuid">;
  sessionId: (string & tags.Format<"uuid">) | null;
}): Promise<IAuthorizationToken> {
  const nowTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  return {
    access: jwt.sign(
      {
        type: "guest",
        id: props.guestId,
        session_id: props.sessionId,
        created_at: nowTimestamp,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: props.guestId,
        session_id: props.sessionId,
        tokenType: "refresh",
        created_at: nowTimestamp,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ),
  };
}
async function generateSessionToken(props: {
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<string> {
  return jwt.sign(
    {
      type: "session",
      id: props.guestId,
      session_id: props.sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformAuthGuestJoin(props: {
//   ip: string;
//   body: IHrmPlatformGuest.IJoin;
// }): Promise<IHrmPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------