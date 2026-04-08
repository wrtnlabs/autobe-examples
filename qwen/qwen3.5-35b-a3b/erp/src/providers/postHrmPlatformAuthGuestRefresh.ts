import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthGuestRefresh(props: {
  body: IHrmPlatformGuest.IRefresh;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  // 1. Verify refresh token with JWT
  type IJwtPayload = {
    type: "guest";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as IJwtPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists and is active
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrm_platform_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  const nowIso = toISOStringSafe(new Date());
  const sessionExpired = new Date(session.expired_at) <= new Date(nowIso);
  if (sessionExpired) {
    throw new HttpException("Session expired", 401);
  }
  // 3. Validate guest account not deleted
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 404);
  }
  // 4. Generate new tokens with fresh expiration
  const accessExpiresTime = Date.parse(nowIso) + 60 * 60 * 1000;
  const refreshExpiresTime = Date.parse(nowIso) + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresTime));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresTime));
  const access: string = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  ) satisfies string;
  const refresh: string = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  ) satisfies string;
  // 5. Update session with new expiration
  await MyGlobal.prisma.hrm_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresIso) },
  });
  // 6. Return IAuthorized response
  return {
    id: guest.id,
    device_identifier: guest.device_identifier,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
    session_id: session.id,
    organization_id: null,
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
// import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformAuthGuestRefresh(props: {
//   body: IHrmPlatformGuest.IRefresh;
// }): Promise<IHrmPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------