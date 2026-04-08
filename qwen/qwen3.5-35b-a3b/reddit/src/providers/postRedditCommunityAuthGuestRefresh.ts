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

export async function postRedditCommunityAuthGuestRefresh(props: {
  body: IRedditCommunityGuest.IRefresh;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const refreshTokenType: string = "guest";
  let tokenPayload: {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    tokenPayload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as any as typeof tokenPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (tokenPayload.type !== refreshTokenType) {
    throw new HttpException("Invalid token type", 403);
  }
  const sessionRecord =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: tokenPayload.session_id,
        reddit_community_guest_id: tokenPayload.id,
        deleted_at: null,
      },
    });
  if (!sessionRecord) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (sessionRecord.expired_at < new Date()) {
    throw new HttpException("Session expired", 401);
  }
  const guestRecord =
    await MyGlobal.prisma.reddit_community_guests.findUniqueOrThrow({
      where: { id: tokenPayload.id },
    });
  if (guestRecord.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  const accessToken: string = jwt.sign(
    {
      type: tokenPayload.type,
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshTokenValue: string = jwt.sign(
    {
      type: tokenPayload.type,
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const accessExpirationDate: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpirationDate: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: tokenPayload.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    },
  });
  const tokenData: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshTokenValue,
    expired_at: accessExpirationDate,
    refreshable_until: refreshExpirationDate,
  };
  return {
    id: guestRecord.id,
    email: guestRecord.email,
    device_id: guestRecord.device_id,
    device_fingerprint: guestRecord.device_fingerprint,
    created_at: toISOStringSafe(guestRecord.created_at),
    updated_at: toISOStringSafe(guestRecord.updated_at),
    deleted_at:
      guestRecord.deleted_at !== null
        ? toISOStringSafe(guestRecord.deleted_at)
        : null,
    token: tokenData,
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
// export async function postRedditCommunityAuthGuestRefresh(props: {
//   body: IRedditCommunityGuest.IRefresh;
// }): Promise<IRedditCommunityGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------