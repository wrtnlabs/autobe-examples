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
  // 1. Verify refresh token format and decode payload
  const decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
    created_at: string & tags.Format<"date-time">;
  } = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as unknown as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
    created_at: string & tags.Format<"date-time">;
  };
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findUniqueOrThrow({
      where: { id: decoded.session_id },
    });
  // 4. Check session not soft-deleted
  if (session.deleted_at !== null) {
    throw new HttpException("Session has been revoked", 401);
  }
  // 5. Check session not expired
  const nowTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  if (nowTimestamp > toISOStringSafe(session.expired_at)) {
    throw new HttpException("Session has expired", 401);
  }
  // 6. Validate guest account exists
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 7. Check guest not deleted
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 8. Generate new tokens
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const tokenCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessToken: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "24h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpires),
      updated_at: new Date(),
    },
  });
  // 10. Return response
  const result: IEcommerceMallGuest.IAuthorized = {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
  return result;
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