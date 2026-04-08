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
  // 1. Verify refresh token with proper type narrowing
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  } | null = null;
  try {
    const verified = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof verified === "object" &&
      verified !== null &&
      "id" in verified &&
      "session_id" in verified &&
      "type" in verified
    ) {
      const v = verified as Record<string, unknown>;
      if (
        typeof v.id === "string" &&
        typeof v.session_id === "string" &&
        typeof v.type === "string" &&
        (typeof v.created_at === "string" || v.created_at === undefined)
      ) {
        decoded = {
          id: v.id,
          session_id: v.session_id,
          type: v.type,
          created_at: v.created_at ?? "",
        };
      }
    }
  } catch {
    decoded = null;
  }
  if (!decoded) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is guest
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const nowMs = Date.now();
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        ecommerce_mall_guest_id: decoded.id,
        expired_at: {
          gt: new Date(nowMs),
        },
      },
      select: {
        id: true,
        ecommerce_mall_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest account is not soft-deleted
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!guest) {
    throw new HttpException("Guest account has been deleted", 401);
  }
  // 5. Generate new token pair with token rotation (same session_id)
  const nowIso: string & tags.Format<"date-time"> = new Date(
    nowMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const accessExpiresMs = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresIso: string & tags.Format<"date-time"> = new Date(
    accessExpiresMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresIso: string & tags.Format<"date-time"> = new Date(
    refreshExpiresMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration to new refresh token expiry
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresMs),
      ip: props.body.ip ?? session.ip,
      href: props.body.href ?? session.href,
      referrer: props.body.referrer ?? session.referrer,
    },
  });
  // 7. Update guest last active timestamp
  await MyGlobal.prisma.ecommerce_mall_guests.update({
    where: { id: decoded.id },
    data: {
      last_active_at: new Date(nowMs),
    },
  });
  // 8. Return authorized response with proper branded types
  const resultId: string & tags.Format<"uuid"> = decoded.id;
  const resultExpiredAt: string & tags.Format<"date-time"> = accessExpiresIso;
  const resultRefreshableUntil: string & tags.Format<"date-time"> =
    refreshExpiresIso;
  return {
    id: resultId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: resultExpiredAt,
      refreshable_until: resultRefreshableUntil,
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