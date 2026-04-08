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
  // 1. Verify refresh token
  let decoded:
    | {
        id: string & tags.Format<"uuid">;
        session_id: string & tags.Format<"uuid">;
        type: "superadmin";
      }
    | undefined;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) satisfies {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "superadmin";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded === undefined) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session still exists
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        super_admin_id: decoded.id,
      },
      select: { id: true },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate super admin exists and not soft-deleted
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Generate new tokens with same session_id (token rotation)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessTokenPayload = {
    type: "superadmin",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: now.toISOString(),
  };
  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshTokenPayload = {
    type: "superadmin",
    id: decoded.id,
    session_id: decoded.session_id,
    tokenType: "refresh",
    created_at: now.toISOString(),
  };
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 6. Return authorized response
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    grade: superAdmin.grade,
    createdAt: superAdmin.created_at.toISOString(),
    updatedAt: superAdmin.updated_at.toISOString(),
    deletedAt:
      superAdmin.deleted_at === null
        ? null
        : superAdmin.deleted_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
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