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

export async function postEcommerceMallAuthAdminLogin(props: {
  ip: string;
  body: IEcommerceMallAdmin.ILogin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // Find admin by email with password_hash explicitly selected
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Calculate token expiration times as ISO strings (no native Date type)
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  const createdAtIso = new Date(nowMs).toISOString();
  const accessExpiresIso = new Date(accessExpiresMs).toISOString();
  const refreshExpiresIso = new Date(refreshExpiresMs).toISOString();
  // Create new session
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(accessExpiresMs),
      expired_at: new Date(accessExpiresMs),
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: createdAtIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAtIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  // Return authorized admin with tokens
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    deleted_at:
      admin.deleted_at !== null ? admin.deleted_at.toISOString() : null,
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdminLogin(props: {
//   ip: string;
//   body: IEcommerceMallAdmin.ILogin;
// }): Promise<IEcommerceMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------