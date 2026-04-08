import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthGuestJoin(props: {
  ip: string;
  body: IRedditCloneGuest.IJoin;
}): Promise<IRedditCloneGuest.IAuthorized> {
  const now = toISOStringSafe(new Date());
  // Check if guest already exists with this fingerprint (idempotent)
  const existingGuest = await MyGlobal.prisma.reddit_clone_guests.findFirst({
    where: { fingerprint: props.body.fingerprint },
    select: { id: true },
  });
  const guestId: string & tags.Format<"uuid"> = existingGuest
    ? existingGuest.id
    : (
        await MyGlobal.prisma.reddit_clone_guests.create({
          data: {
            id: v4(),
            fingerprint: props.body.fingerprint,
            created_at: now,
            updated_at: now,
          },
          select: { id: true },
        })
      ).id;
  // Calculate token expiration times
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create session
  const sessionId = v4();
  await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_clone_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // Generate JWT tokens
  const tokenPayload = {
    type: "guest" as const,
    id: guestId,
    session_id: sessionId,
    created_at: now,
  };
  const accessToken: string = jwt.sign(
    tokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  const refreshToken: string = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
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
// import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneAuthGuestJoin(props: {
//   ip: string;
//   body: IRedditCloneGuest.IJoin;
// }): Promise<IRedditCloneGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------