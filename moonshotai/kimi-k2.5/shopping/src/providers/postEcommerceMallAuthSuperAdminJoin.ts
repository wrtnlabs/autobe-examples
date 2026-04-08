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

export async function postEcommerceMallAuthSuperAdminJoin(props: {
  ip: string;
  body: IEcommerceMallSuperAdmin.IJoin;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  // Generate UUID and timestamps with strict types
  const superAdminId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Create super admin
  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id: superAdminId,
      email: props.body.email,
      password_hash: passwordHash,
      grade: "super_admin",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create session
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
    data: {
      id: sessionId,
      super_admin_id: superAdminId,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdminId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadmin",
        id: superAdminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ),
  };
  // Return IAuthorized
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    grade: superAdmin.grade,
    createdAt: superAdmin.created_at,
    updatedAt: superAdmin.updated_at,
    deletedAt: superAdmin.deleted_at,
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
// export async function postEcommerceMallAuthSuperAdminJoin(props: {
//   ip: string;
//   body: IEcommerceMallSuperAdmin.IJoin;
// }): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------