import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthAdministratorRefresh(props: {
  body: IMallPlatformAdministrator.IRefresh;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  const verified: unknown = (() => {
    try {
      return jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  const isAdministratorRefreshPayload = (
    value: unknown,
  ): value is {
    type: "administrator";
    id: string;
    session_id: string;
    created_at: string;
    tokenType?: "refresh";
  } => {
    if (typeof value !== "object" || value === null) return false;
    if (
      !Object.prototype.hasOwnProperty.call(value, "type") ||
      !Object.prototype.hasOwnProperty.call(value, "id") ||
      !Object.prototype.hasOwnProperty.call(value, "session_id") ||
      !Object.prototype.hasOwnProperty.call(value, "created_at")
    ) {
      return false;
    }
    const typeValue = (
      value as {
        [key: string]: unknown;
      }
    ).type;
    const idValue = (
      value as {
        [key: string]: unknown;
      }
    ).id;
    const sessionIdValue = (
      value as {
        [key: string]: unknown;
      }
    ).session_id;
    const createdAtValue = (
      value as {
        [key: string]: unknown;
      }
    ).created_at;
    const tokenTypeValue = (
      value as {
        [key: string]: unknown;
      }
    ).tokenType;
    if (typeValue !== "administrator") return false;
    if (typeof idValue !== "string") return false;
    if (typeof sessionIdValue !== "string") return false;
    if (typeof createdAtValue !== "string") return false;
    if (tokenTypeValue !== undefined && tokenTypeValue !== "refresh")
      return false;
    return true;
  };
  if (!isAdministratorRefreshPayload(verified)) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.mall_platform_administrator_sessions.findFirst({
      where: {
        id: verified.session_id,
        administrator_id: verified.id,
        expired_at: { gt: new Date() },
      },
      select: {
        id: true,
        administrator_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: verified.id },
      select: {
        id: true,
        email: true,
        grade: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (administrator.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.mall_platform_administrator_sessions.update({
    where: { id: verified.session_id },
    data: {
      expired_at: refreshableUntil,
    },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: null,
    token: {
      access: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: verified.session_id,
          created_at: toISOStringSafe(now),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: verified.session_id,
          created_at: toISOStringSafe(now),
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
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
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthAdministratorRefresh(props: {
//   body: IMallPlatformAdministrator.IRefresh;
// }): Promise<IMallPlatformAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------