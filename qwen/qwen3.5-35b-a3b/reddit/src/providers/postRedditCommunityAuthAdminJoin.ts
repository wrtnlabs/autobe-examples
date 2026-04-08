import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthAdminJoin(props: {
  ip: string;
  body: IRedditCommunityAdmin.IJoin;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  // Validate password strength
  if (props.body.password.length < 8) {
    throw new HttpException("Password must be at least 8 characters", 400);
  }
  // Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.reddit_community_admins.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingAdmin !== undefined) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate UUIDs with proper typing
  const adminId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Create admin account with hashed password
  const createdTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const prismaAdmin = await MyGlobal.prisma.reddit_community_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name ?? null,
      is_active: true,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Convert Prisma Date fields to string & tags.Format<"date-time">
  const admin: IRedditCommunityAdmin = {
    id: prismaAdmin.id,
    email: prismaAdmin.email,
    display_name: prismaAdmin.display_name,
    is_active: prismaAdmin.is_active,
    created_at: toISOStringSafe(prismaAdmin.created_at),
    updated_at: toISOStringSafe(prismaAdmin.updated_at),
    deleted_at: prismaAdmin.deleted_at
      ? toISOStringSafe(prismaAdmin.deleted_at)
      : null,
  };
  // Calculate expiration timestamps
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create session
  await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: sessionId,
      reddit_community_admin_id: adminId,
      ip: props.ip,
      href: null,
      referrer: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      expired_at: toISOStringSafe(new Date(accessExpires)),
    },
  });
  // Generate JWT tokens
  const accessJwt: string = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      created_at: createdTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshJwt: string = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessJwt,
    refresh: refreshJwt,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return IAuthorized pattern
  const response: IRedditCommunityAdmin.IAuthorized = {
    id: adminId,
    email: admin.email,
    display_name: admin.display_name ?? undefined,
    is_active: admin.is_active,
    created_at: createdTimestamp,
    updated_at: createdTimestamp,
    deleted_at: null,
    token,
  };
  return response;
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
// import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAuthAdminJoin(props: {
//   ip: string;
//   body: IRedditCommunityAdmin.IJoin;
// }): Promise<IRedditCommunityAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------