import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthGuestRefresh(props: {
  body: IRedditPlatformGuest.IRefresh;
}): Promise<IRedditPlatformGuest.IAuthorized> {
  // 1. Verify refresh token
  const decodedPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof decodedPayload !== "object" || decodedPayload === null) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const type: string = decodedPayload.type as any as string;
  const id: string = decodedPayload.id as any as string;
  const sessionId: string = decodedPayload.session_id as any as string;
  // 2. Validate type
  if (type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  const guestId: string & tags.Format<"uuid"> = id as string &
    tags.Format<"uuid">;
  const sessionUUID: string & tags.Format<"uuid"> = sessionId as string &
    tags.Format<"uuid">;
  // 3. Validate session exists and belongs to guest
  const session =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findFirst({
      where: {
        id: sessionUUID,
        reddit_platform_guest_id: guestId,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest is not deleted
  const guest = await MyGlobal.prisma.reddit_platform_guests.findUniqueOrThrow({
    where: { id: guestId },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate timestamps
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nowString: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const accessExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  // 6. Generate new tokens (SAME session_id)
  const newAccessToken: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionUUID,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionUUID,
      tokenType: "refresh",
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.reddit_platform_guest_sessions.update({
    where: { id: sessionUUID },
    data: { expired_at: refreshExpires },
  });
  // 8. Return IAuthorized response with proper types
  const response: IRedditPlatformGuest.IAuthorized = {
    id: guestId,
    fingerprint: guest.fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
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
// import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformAuthGuestRefresh(props: {
//   body: IRedditPlatformGuest.IRefresh;
// }): Promise<IRedditPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------