import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
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

export async function postCommunityHubAuthGuestRefresh(props: {
  body: ICommunityHubGuest.IRefresh;
}): Promise<ICommunityHubGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const verified = jwt.verify(
      props.body.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified === "string") {
      throw new HttpException("Invalid refresh token format", 401);
    }
    decoded = {
      id: typeof verified.id === "string" ? verified.id : "",
      session_id:
        typeof verified.session_id === "string" ? verified.session_id : "",
      type: typeof verified.type === "string" ? verified.type : "",
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.community_hub_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      community_hub_guest_id: decoded.id,
    },
  });
  if (session === null) {
    throw new HttpException("Session not found or revoked", 401);
  }
  // 4. Check session expiration
  const now = Date.now();
  if (session.expired_at.getTime() < now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate guest record exists
  const guest = await MyGlobal.prisma.community_hub_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 6. Generate new token pair with same session_id
  const accessExpires = new Date(now + 15 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const createdIso = new Date(now).toISOString();
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Extend session expiration
  await MyGlobal.prisma.community_hub_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return authorized guest
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
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
// import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubAuthGuestRefresh(props: {
//   body: ICommunityHubGuest.IRefresh;
// }): Promise<ICommunityHubGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------