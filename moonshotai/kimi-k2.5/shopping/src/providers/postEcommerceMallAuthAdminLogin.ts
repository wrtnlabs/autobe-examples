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
  // Find admin by email with password_hash for verification
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      grade: true,
      status: true,
      nickname: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (admin === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check account status is active
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // Generate session ID
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Calculate expiration times
  const now = new Date();
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 3600000),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 604800000),
  );
  // Create session
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: expiredAt,
      created_at: now,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Construct IAuthorizationToken
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  // Determine grade with runtime validation
  let grade: "regular" | "super_admin" = "regular";
  if (admin.grade === "super_admin") {
    grade = "super_admin";
  } else if (admin.grade !== "regular") {
    throw new HttpException("Invalid admin grade", 500);
  }
  // Determine status with runtime validation
  let status: "active" | "suspended" | "banned" = "active";
  if (admin.status === "suspended") {
    status = "suspended";
  } else if (admin.status === "banned") {
    status = "banned";
  }
  // Construct IAuthorized response
  return {
    id: admin.id,
    email: admin.email,
    grade,
    status,
    nickname: admin.nickname,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
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