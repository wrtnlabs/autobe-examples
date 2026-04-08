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
  // 1. Find super admin by email with password_hash explicitly selected
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 2. Return 401 if email not found
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Return 403 if account is soft-deleted
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been suspended", 403);
  }
  // 4. Verify password
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Create session timestamps as ISO datetime strings
  const now = new Date();
  const accessExpiresTimestamp = now.getTime() + 60 * 60 * 1000; // 1 hour
  const refreshExpiresTimestamp = now.getTime() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const nowStr = toISOStringSafe(now);
  const accessExpiresStr = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpiresStr = toISOStringSafe(new Date(refreshExpiresTimestamp));
  // Create new session
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4(),
        ecommerce_mall_super_admin_id: superAdmin.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(nowStr),
        expired_at: new Date(accessExpiresStr),
      },
    });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "super_admin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "super_admin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  // 7. Return authorized response
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt: null,
    token,
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