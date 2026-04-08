import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthGuestJoin(props: {
  ip: string;
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const { email, password, href, referrer, ip: bodyIp } = props.body;
  const clientIp: string = bodyIp ?? props.ip;
  // 1. Check duplicate email
  const existingGuest = await MyGlobal.prisma.reddit_community_guests.findFirst(
    {
      where: { email },
    },
  );
  if (existingGuest !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create guest account
  const guestId: string & tags.Format<"uuid"> = v4();
  const deviceId: string & tags.Format<"uuid"> = v4();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updatedAt: string & tags.Format<"date-time"> = createdAt;
  const guest = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id: guestId,
      email,
      password_hash: await PasswordUtil.hash(password),
      device_id: deviceId,
      device_fingerprint: null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
  });
  // 3. Create session
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_community_guest_id: guest.id,
      ip: clientIp,
      href,
      referrer: referrer ?? null,
      access_token: null,
      refresh_token: null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: sessionId,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Return IAuthorized response
  return {
    id: guest.id,
    email: guest.email,
    device_id: guest.device_id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
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
// import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAuthGuestJoin(props: {
//   ip: string;
//   body: IRedditCommunityGuest.IJoin;
// }): Promise<IRedditCommunityGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------