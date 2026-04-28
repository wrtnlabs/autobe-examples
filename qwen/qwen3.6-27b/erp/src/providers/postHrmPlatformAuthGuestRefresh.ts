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

export async function postHrmPlatformAuthGuestRefresh(props: {
  body: IHrmPlatformGuest.IRefresh;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  // 1. Verify and decode refresh token
  const raw: unknown = jwt.verify(
    props.body.refresh,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  if (typeof raw !== "object" || raw === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const decodedRecord = raw as Record<string, unknown>;
  const decodedType: string | undefined =
    typeof decodedRecord.type === "string" ? decodedRecord.type : undefined;
  const decodedId: string | undefined =
    typeof decodedRecord.id === "string" ? decodedRecord.id : undefined;
  const decodedSessionId: string | undefined =
    typeof decodedRecord.session_id === "string"
      ? decodedRecord.session_id
      : undefined;
  if (!decodedType || !decodedId || !decodedSessionId) {
    throw new HttpException("Invalid token payload", 401);
  }
  // 2. Validate token type is guest
  if (decodedType !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate existing session is active
  const existingSession =
    await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
      where: {
        id: decodedSessionId,
        hrm_platform_guest_id: decodedId,
        expired_at: {
          gt: toISOStringSafe(new Date()),
        },
      },
    });
  if (!existingSession) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Verify guest exists and is not soft-deleted
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    where: {
      id: decodedId,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate expiration times
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 6. Generate new access token
  const accessToken: string = jwt.sign(
    {
      type: "guest",
      id: decodedId,
      session_id: decodedSessionId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // 7. Generate new refresh token
  const refreshToken: string = jwt.sign(
    {
      type: "guest",
      id: decodedId,
      session_id: decodedSessionId,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 8. Create new session record
  await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: v4(),
      hrm_platform_guest_id: decodedId,
      ip: existingSession.ip,
      href: existingSession.href,
      referrer: existingSession.referrer,
      created_at: new Date(),
      expired_at: new Date(refreshExpiredAt),
    },
  });
  // 9. Return authorization response
  const guestId: string & tags.Format<"uuid"> = guest.id as never;
  return {
    id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  } satisfies IHrmPlatformGuest.IAuthorized;
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
// export async function postHrmPlatformAuthGuestRefresh(props: {
//   body: IHrmPlatformGuest.IRefresh;
// }): Promise<IHrmPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------