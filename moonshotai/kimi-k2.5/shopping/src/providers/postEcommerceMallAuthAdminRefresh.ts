import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function postEcommerceMallAuthAdminRefresh(props: {
  body: IEcommerceMallAdmin.IRefresh;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "admin";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not expired
  const now = new Date();
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        ecommerce_mall_admin_id: decoded.id,
        expired_at: {
          gt: now,
        },
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin exists and not deleted
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 6. Generate new tokens with SAME session_id
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      token_type: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration (token rotation - new refresh token stored)
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  // 8. Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    grade: admin.grade as "regular" | "super_admin",
    status: admin.status as "active" | "suspended" | "banned",
    nickname: admin.nickname,
    createdAt: admin.created_at.toISOString(),
    updatedAt: admin.updated_at.toISOString(),
    deletedAt: admin.deleted_at?.toISOString() ?? null,
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceMallAdmin.IAuthorized;
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdminRefresh(props: {
//   body: IEcommerceMallAdmin.IRefresh;
// }): Promise<IEcommerceMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------