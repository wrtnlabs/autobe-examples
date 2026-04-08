import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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

export async function postEcommerceMallAuthSuperAdminRefresh(props: {
  body: IEcommerceMallSuperAdmin.IRefresh;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // Token payload interface for proper typing (no 'as' assertions)
  interface IRefreshTokenPayload {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
  }
  // Helper to convert milliseconds to ISO 8601 string format (avoid native Date type)
  const msToISOString = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const d = new Date(0);
    d.setUTCSeconds(seconds);
    return d.toISOString();
  };
  // 1. Verify refresh token with jwt.verify
  let decoded: IRefreshTokenPayload;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as IRefreshTokenPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is super_admin
  if (decoded.type !== "super_admin") {
    throw new HttpException("Invalid token type for super admin refresh", 403);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_super_admin_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate superAdmin account exists and is not deleted
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUnique({
      where: { id: decoded.id },
    });
  if (!superAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id for continuity
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000; // 1 hour in milliseconds
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const createdAtISO = msToISOString(nowMs);
  const accessExpiredAtISO = msToISOString(accessExpiresMs);
  const refreshExpiredAtISO = msToISOString(refreshExpiresMs);
  // Access token payload
  const accessTokenPayload = {
    type: "super_admin" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: createdAtISO,
  };
  // Refresh token payload
  const refreshTokenPayload = {
    type: "super_admin" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    tokenType: "refresh" as const,
    created_at: createdAtISO,
  };
  const newAccessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const newRefreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 6. Update session expiration (Prisma requires Date for DateTime columns)
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresMs),
    },
  });
  // 7. Return authorized response
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: superAdmin.created_at.toISOString(),
    updated_at: superAdmin.updated_at.toISOString(),
    deleted_at: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiredAtISO,
      refreshable_until: refreshExpiredAtISO,
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
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSuperAdminRefresh(props: {
//   body: IEcommerceMallSuperAdmin.IRefresh;
// }): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------