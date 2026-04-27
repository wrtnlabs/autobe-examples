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

export async function postCommunityPlatformAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  //--------------------------------------------------
  // 1. Verify refresh token signature and decode
  //--------------------------------------------------
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    const result = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
    decoded = typia.assert<typeof decoded>(result);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  //--------------------------------------------------
  // 2. Validate token type matches guest actor
  //--------------------------------------------------
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  //--------------------------------------------------
  // 3. Verify session exists and has not expired
  //--------------------------------------------------
  const nowIso = new Date().toISOString();
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        expired_at: { gt: nowIso },
      },
      select: {
        id: true,
        community_platform_guest_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or not found", 401);
  }
  //--------------------------------------------------
  // 4. Validate the guest identity is still active
  //--------------------------------------------------
  const guest =
    await MyGlobal.prisma.community_platform_guests.findUniqueOrThrow({
      where: { id: session.community_platform_guest_id },
      select: { id: true, deleted_at: true },
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account is no longer active", 403);
  }
  //--------------------------------------------------
  // 5. Compute branded timestamp values (no Date type)
  //--------------------------------------------------
  const guestId: string & tags.Format<"uuid"> = typia.assert(guest.id);
  const nowMs: number = Date.now();
  const createdAt: string & tags.Format<"date-time"> = typia.assert(
    new Date(nowMs).toISOString(),
  );
  const accessExpiredAt: string & tags.Format<"date-time"> = typia.assert(
    new Date(nowMs + 60 * 60 * 1000).toISOString(),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = typia.assert(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );
  //--------------------------------------------------
  // 6. Generate new access token (1 hour) — same session_id
  //--------------------------------------------------
  const accessToken: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  //--------------------------------------------------
  // 7. Generate new refresh token (7 days) — same session_id
  //--------------------------------------------------
  const refreshToken: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  //--------------------------------------------------
  // 8. Extend session lifetime
  //--------------------------------------------------
  await MyGlobal.prisma.community_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiredAt },
  });
  //--------------------------------------------------
  // 9. Return authorization response
  //--------------------------------------------------
  return {
    id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
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
// import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformAuthGuestRefresh(props: {
//   body: ICommunityPlatformGuest.IRefresh;
// }): Promise<ICommunityPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------