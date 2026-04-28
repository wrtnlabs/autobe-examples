import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
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

export async function postEcommercePlatformAuthAdminRefresh(props: {
  body: IEcommercePlatformAdmin.IRefresh;
}): Promise<IEcommercePlatformAdmin.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (
    decoded === null ||
    typeof decoded !== "object" ||
    !("type" in decoded) ||
    !("id" in decoded) ||
    !("session_id" in decoded)
  ) {
    throw new HttpException("Invalid refresh token format", 401);
  }
  const payload = decoded as {
    type: string;
    id: string;
    session_id: string;
  };
  if (payload.type !== "admin") {
    throw new HttpException("Invalid token type for admin refresh", 401);
  }
  const session =
    await MyGlobal.prisma.ecommerce_platform_admin_sessions.findFirst({
      where: {
        id: payload.session_id,
        ecommerce_platform_admin_id: payload.id,
        expired_at: { gt: new Date() },
      },
    });
  if (session === null) {
    throw new HttpException("Expired or invalid session", 401);
  }
  const admin =
    await MyGlobal.prisma.ecommerce_platform_admins.findUniqueOrThrow({
      where: { id: payload.id },
      select: {
        id: true,
        is_super: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (admin.is_banned === true) {
    throw new HttpException("Account is banned", 403);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: payload.type,
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_platform_admin_sessions.update({
    where: { id: payload.session_id },
    data: { expired_at: refreshExpires },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: admin.id,
    isSuper: admin.is_super,
    isBanned: admin.is_banned,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: null,
    token,
  } satisfies IEcommercePlatformAdmin.IAuthorized;
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
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformAuthAdminRefresh(props: {
//   body: IEcommercePlatformAdmin.IRefresh;
// }): Promise<IEcommercePlatformAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------