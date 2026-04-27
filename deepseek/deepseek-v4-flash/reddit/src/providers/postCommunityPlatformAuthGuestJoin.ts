import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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

export async function postCommunityPlatformAuthGuestJoin(props: {
  ip: string;
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // ----
  // 1. Look up existing guest by device fingerprint
  // ----
  const existing = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
    select: { id: true, deleted_at: true },
  });
  let guestId: string;
  if (existing !== null) {
    if (existing.deleted_at === null) {
      // Reuse existing active guest — identity preserved
      guestId = existing.id;
    } else {
      // Reactivate soft-deleted guest
      await MyGlobal.prisma.community_platform_guests.update({
        where: { id: existing.id },
        data: {
          deleted_at: null,
          updated_at: new Date().toISOString(),
        },
      });
      guestId = existing.id;
    }
  } else {
    // Create new guest record
    try {
      const guest = await MyGlobal.prisma.community_platform_guests.create({
        data: {
          id: v4(),
          device_fingerprint: props.body.device_fingerprint,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
      });
      guestId = guest.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HttpException("Conflict", 409);
      }
      throw error;
    }
  }
  // ----
  // 2. Resolve IP (use request body IP or fall back to request context)
  // ----
  const ip: string = props.body.ip ?? props.ip;
  // ----
  // 3. Compute timestamps for session and tokens
  // ----
  const now: string = new Date().toISOString();
  const accessExpiresAt: string = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  // ----
  // 4. Create guest session
  // ----
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.create({
      data: {
        id: v4(),
        community_platform_guest_id: guestId,
        ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: refreshExpiresAt,
      },
    });
  // ----
  // 5. Generate JWT tokens and return IAuthorized
  // ----
  return {
    id: guestId,
    token: {
      access: jwt.sign(
        {
          type: "guest",
          id: guestId,
          session_id: session.id,
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "15m", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: guestId,
          session_id: session.id,
          tokenType: "refresh",
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "24h", issuer: "autobe" },
      ),
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  } satisfies ICommunityPlatformGuest.IAuthorized;
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
// import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformAuthGuestJoin(props: {
//   ip: string;
//   body: ICommunityPlatformGuest.IJoin;
// }): Promise<ICommunityPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------