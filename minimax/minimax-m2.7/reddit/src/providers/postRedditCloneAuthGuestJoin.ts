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
  // 1. Check if guest already exists by fingerprint
  const existingGuest = await MyGlobal.prisma.reddit_clone_guests.findFirst({
    where: { fingerprint: props.body.fingerprint },
  });
  // 2. Create guest if not exists (idempotent for same fingerprint)
  const guestId: string & tags.Format<"uuid"> = v4();
  const createdAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const guest =
    existingGuest ??
    (await MyGlobal.prisma.reddit_clone_guests.create({
      data: {
        id: guestId,
        fingerprint: props.body.fingerprint,
        created_at: createdAt,
        updated_at: createdAt,
      },
    }));
  // 3. Calculate token expiration times
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpiresMs: number = 15 * 60 * 1000;
  const refreshExpiresMs: number = 7 * 24 * 60 * 60 * 1000;
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + accessExpiresMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + refreshExpiresMs,
  ).toISOString() as string & tags.Format<"date-time">;
  // 4. Create guest session
  const sessionId: string & tags.Format<"uuid"> = v4();
  const sessionIp: string = props.body.ip ?? props.ip;
  await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_clone_guest_id: guest.id,
      ip: sessionIp,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 5. Generate JWT tokens
  const accessToken: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return IAuthorized response
  return {
    id: guest.id,
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