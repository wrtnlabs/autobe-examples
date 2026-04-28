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

export async function postEcommercePlatformAuthAdminJoin(props: {
  ip: string;
  body: IEcommercePlatformAdmin.IJoin;
}): Promise<IEcommercePlatformAdmin.IAuthorized> {
  // Validate email uniqueness across registered account types
  const existingCustomer =
    await MyGlobal.prisma.ecommerce_platform_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const existingSeller =
    await MyGlobal.prisma.ecommerce_platform_sellers.findFirst({
      where: { email: props.body.email },
    });
  if (existingSeller !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash the password for secure credential handling
  await PasswordUtil.hash(props.body.password);
  // Create administrator record with default regular-admin privileges
  const now = new Date();
  const admin = await MyGlobal.prisma.ecommerce_platform_admins.create({
    data: {
      id: v4(),
      is_super: false,
      is_banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create authentication session with security context (ip, href, referrer)
  const accessExpires = new Date(Date.now() + 3600000);
  const session =
    await MyGlobal.prisma.ecommerce_platform_admin_sessions.create({
      data: {
        id: v4(),
        ecommerce_platform_admin_id: admin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT access (1 hour) and refresh (7 days) tokens
  const refreshExpires = new Date(Date.now() + 604800000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return authorized admin response
  return {
    id: admin.id,
    isSuper: admin.is_super,
    isBanned: admin.is_banned,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
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
// export async function postEcommercePlatformAuthAdminJoin(props: {
//   ip: string;
//   body: IEcommercePlatformAdmin.IJoin;
// }): Promise<IEcommercePlatformAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------