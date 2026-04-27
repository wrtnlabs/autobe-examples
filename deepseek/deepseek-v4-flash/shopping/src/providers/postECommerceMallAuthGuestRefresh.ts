import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
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

export async function postECommerceMallAuthGuestRefresh(props: {
  body: IECommerceMallGuest.IRefresh;
}): Promise<IECommerceMallGuest.IAuthorized> {
  // -------------------------------------------------------
  // 1. VERIFY AND DECODE THE REFRESH TOKEN
  // -------------------------------------------------------
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: string;
    }>(
      jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // -------------------------------------------------------
  // 2. LOOK UP THE ASSOCIATED GUEST SESSION
  // -------------------------------------------------------
  const oldSession =
    await MyGlobal.prisma.e_commerce_mall_guest_sessions.findUnique({
      where: { id: decoded.session_id },
      select: {
        e_commerce_mall_guest_id: true,
        ip: true,
        expired_at: true,
      },
    });
  // -------------------------------------------------------
  // 3. TOKEN REUSE DETECTION
  //    If the session no longer exists, a previously rotated
  //    token is being presented → potential token theft.
  //    Invalidate ALL sessions for this guest as precaution.
  // -------------------------------------------------------
  if (oldSession === null) {
    await MyGlobal.prisma.e_commerce_mall_guest_sessions.updateMany({
      where: { e_commerce_mall_guest_id: decoded.id },
      data: { expired_at: "1970-01-01T00:00:00.000Z" },
    });
    throw new HttpException(
      "Token has been reused. All sessions invalidated.",
      401,
    );
  }
  // -------------------------------------------------------
  // 4. VERIFY SESSION IS NOT EXPIRED
  //    ISO 8601 string comparison works lexicographically
  //    because date components are zero-padded.
  // -------------------------------------------------------
  const now: string = toISOStringSafe(new Date(Date.now()));
  const expiredAt: string = toISOStringSafe(oldSession.expired_at);
  if (expiredAt < now) {
    throw new HttpException("Session expired", 401);
  }
  // -------------------------------------------------------
  // 5. INVALIDATE THE OLD SESSION (token rotation)
  // -------------------------------------------------------
  await MyGlobal.prisma.e_commerce_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: now },
  });
  // -------------------------------------------------------
  // 6. CREATE A NEW SESSION WITH FRESH EXPIRATION
  // -------------------------------------------------------
  const newSessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const accessExpiresAt: string = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.e_commerce_mall_guest_sessions.create({
    data: {
      id: newSessionId,
      e_commerce_mall_guest_id: oldSession.e_commerce_mall_guest_id,
      ip: oldSession.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpiresAt,
    },
  });
  // -------------------------------------------------------
  // 7. GENERATE NEW JWT TOKENS
  // -------------------------------------------------------
  const accessToken: string = jwt.sign(
    {
      type: "guest",
      id: oldSession.e_commerce_mall_guest_id,
      session_id: newSessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "guest",
      id: oldSession.e_commerce_mall_guest_id,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // -------------------------------------------------------
  // 8. RETURN NEW AUTHENTICATION TOKENS
  // -------------------------------------------------------
  return {
    id: typia.assert<string & tags.Format<"uuid">>(
      oldSession.e_commerce_mall_guest_id,
    ),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpiresAt,
      ),
      refreshable_until: typia.assert<string & tags.Format<"date-time">>(
        refreshExpiresAt,
      ),
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
// import { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthGuestRefresh(props: {
//   body: IECommerceMallGuest.IRefresh;
// }): Promise<IECommerceMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------