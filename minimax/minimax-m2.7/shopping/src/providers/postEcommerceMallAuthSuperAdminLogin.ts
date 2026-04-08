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

export async function postEcommerceMallAuthSuperAdminLogin(props: {
  ip: string;
  body: IEcommerceMallSuperAdmin.ILogin;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // 1. Find super admin by email (include password_hash explicitly for verification)
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session with access and refresh expiration
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const createdAt = new Date();
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4(),
        ecommerce_mall_super_admin_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: createdAt,
        expired_at: accessExpiresAt,
      },
    });
  // 4. Generate JWT tokens with proper payload structure
  const accessTokenPayload = {
    type: "super_admin" as const,
    id: superAdmin.id,
    session_id: session.id,
    created_at: createdAt.toISOString(),
  };
  const refreshTokenPayload = {
    type: "super_admin" as const,
    id: superAdmin.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: createdAt.toISOString(),
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(refreshTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    }),
    expired_at: accessExpiresAt.toISOString(),
    refreshable_until: refreshExpiresAt.toISOString(),
  };
  // 5. Return authorized response with admin data and tokens
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: superAdmin.created_at.toISOString(),
    updated_at: superAdmin.updated_at.toISOString(),
    deleted_at: null,
    token,
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
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
// export async function postEcommerceMallAuthSuperAdminLogin(props: {
//   ip: string;
//   body: IEcommerceMallSuperAdmin.ILogin;
// }): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------