import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
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

export async function postEcommercePlatformAuthGuestRefresh(props: {
  body: IEcommercePlatformGuest.IRefresh;
}): Promise<IEcommercePlatformGuest.IAuthorized> {
  let decoded: {
    type: "guest";
    id: string;
    session_id: string;
  };
  try {
    const raw = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("type" in raw) ||
      raw.type !== "guest"
    ) {
      throw new Error("Invalid token");
    }
    decoded = {
      type: "guest",
      id: typeof raw.id === "string" ? raw.id : "",
      session_id: typeof raw.session_id === "string" ? raw.session_id : "",
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const guest =
    await MyGlobal.prisma.ecommerce_platform_guests.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Deleted guest account", 401);
  }
  const session =
    await MyGlobal.prisma.ecommerce_platform_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_platform_guest_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const accessJwt = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshJwt = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "24h", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiredAt },
  });
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: null,
    token: {
      access: accessJwt,
      refresh: refreshJwt,
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshExpiredAt),
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
// import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformAuthGuestRefresh(props: {
//   body: IEcommercePlatformGuest.IRefresh;
// }): Promise<IEcommercePlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------