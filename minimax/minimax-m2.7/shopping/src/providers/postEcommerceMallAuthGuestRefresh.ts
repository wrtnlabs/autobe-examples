import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthGuestRefresh(props: {
  body: IEcommerceMallGuest.IRefresh;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  // Token payload type with proper typing
  interface ITokenPayload {
    type: string;
    id: string;
    session_id: string;
    created_at?: string;
    tokenType?: string;
  }
  // Helper to create ISO datetime string
  const toDateTimeString = (date: Date): string & tags.Format<"date-time"> => {
    return date.toISOString() as string & tags.Format<"date-time">;
  };
  // Helper to create UUID string
  const toUuid = (value: string): string & tags.Format<"uuid"> => {
    return value as string & tags.Format<"uuid">;
  };
  // Get current time as Date object for comparisons
  const now = new Date();
  // 1. Verify refresh token
  let decoded: ITokenPayload | undefined;
  try {
    const verified = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = verified as ITokenPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate decoded payload exists
  if (!decoded) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  // 2. Validate token type is guest
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type for guest refresh", 401);
  }
  // 3. Query session with all required fields
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        ecommerce_mall_guest_id: decoded.id,
        expired_at: { gt: now },
      },
      select: {
        id: true,
        ecommerce_mall_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        guest: {
          select: {
            id: true,
            fingerprint: true,
            ip_address: true,
            user_agent: true,
            last_active_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Verify guest not deleted
  if (session.guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 410);
  }
  // 5. Update guest's last_active_at
  const lastActiveTime = new Date();
  const updatedGuest = await MyGlobal.prisma.ecommerce_mall_guests.update({
    where: { id: session.ecommerce_mall_guest_id },
    data: { last_active_at: lastActiveTime },
    select: {
      id: true,
      ip_address: true,
      user_agent: true,
      last_active_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 6. Calculate token expiration times
  const oneHourMs = 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const accessExpires = new Date(Date.now() + oneHourMs);
  const refreshExpires = new Date(Date.now() + sevenDaysMs);
  const tokenCreatedAt = toDateTimeString(lastActiveTime);
  // 7. Generate new access token
  const accessTokenPayload = {
    type: "guest" as const,
    id: session.ecommerce_mall_guest_id,
    session_id: session.id,
    created_at: tokenCreatedAt,
  };
  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 8. Generate new refresh token
  const refreshTokenPayload = {
    type: "guest" as const,
    id: session.ecommerce_mall_guest_id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: tokenCreatedAt,
  };
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires },
  });
  // 10. Build and return authorized response
  const response: IEcommerceMallGuest.IAuthorized = {
    id: toUuid(session.id),
    ipAddress: session.ip || null,
    userAgent: session.referrer || null,
    lastActiveAt: updatedGuest.last_active_at
      ? toDateTimeString(updatedGuest.last_active_at)
      : null,
    createdAt: toDateTimeString(updatedGuest.created_at),
    updatedAt: toDateTimeString(updatedGuest.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toDateTimeString(accessExpires),
      refreshable_until: toDateTimeString(refreshExpires),
    },
  };
  return response;
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
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthGuestRefresh(props: {
//   body: IEcommerceMallGuest.IRefresh;
// }): Promise<IEcommerceMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------