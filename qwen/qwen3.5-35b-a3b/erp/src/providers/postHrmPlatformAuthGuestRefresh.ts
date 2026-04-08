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
  const verifyResult = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      subject: "guest_refresh",
    },
  );
  type GuestRefreshPayload = {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
    tokenType?: string;
  };
  const jwtPayload: GuestRefreshPayload = verifyResult as GuestRefreshPayload;
  if (jwtPayload.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const sessionWhere: Prisma.hrm_platform_guest_sessionsWhereInput = {
    id: jwtPayload.session_id,
    hrm_platform_guest_id: jwtPayload.id,
    expired_at: { gt: new Date() },
  };
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
    where: sessionWhere,
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    where: { id: jwtPayload.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  const accessExpiresIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newSessionToken: string & tags.Format<"uuid"> = v4();
  const newAccessToken: string = jwt.sign(
    {
      type: "guest",
      id: jwtPayload.id,
      session_id: jwtPayload.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "guest",
      id: jwtPayload.id,
      session_id: jwtPayload.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_platform_guest_sessions.update({
    where: { id: jwtPayload.session_id },
    data: {
      session_token: newSessionToken,
      expired_at: new Date(refreshExpiresIso),
    },
  });
  return {
    id: guest.id,
    device_identifier: guest.device_identifier,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
    session_id: jwtPayload.session_id,
    organization_id: null,
  } satisfies IHrmPlatformGuest.IAuthorized;
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