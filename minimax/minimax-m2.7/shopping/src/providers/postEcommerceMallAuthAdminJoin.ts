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

export async function postEcommerceMallAuthAdminJoin(props: {
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Check email uniqueness
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Generate IDs and timestamps
  const adminId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const createdAt = now.toISOString() as string & tags.Format<"date-time">;
  const updatedAt = createdAt;
  const accessExpires = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 3. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // 4. Create admin record
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      name: props.body.name,
      created_at: new Date(createdAt),
      updated_at: new Date(updatedAt),
      deleted_at: null,
    },
  });
  // 5. Create session
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_admin_id: adminId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(createdAt),
      expired_at: new Date(accessExpires),
    },
  });
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Return authorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    name: admin.name,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (admin.deleted_at?.toISOString() as string & tags.Format<"date-time">) ??
      null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdminJoin(props: {
//   ip: string;
//   body: IEcommerceMallAdmin.IJoin;
// }): Promise<IEcommerceMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------