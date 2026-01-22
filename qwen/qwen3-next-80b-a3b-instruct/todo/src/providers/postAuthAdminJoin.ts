import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IJoin;
}): Promise<ITodoListAdmin.IAuthorized> {
  // Validate that email is not already registered
  const existingAdmin = await MyGlobal.prisma.todo_list_admin.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  // Create the admin actor record
  // Use PasswordUtil to hash the password manually since collector doesn't exist
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const admin = await MyGlobal.prisma.todo_list_admin.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Create the admin session record
  const now = new Date();
  const accessExpires = toISOStringSafe(now);
  const refreshExpires = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      created_at: toISOStringSafe(now),
      expired_at: accessExpires,
      ip: props.admin.id, // Using admin ID as IP placeholder
      href: "",
      referrer: "",
    },
  });
  // Generate JWT tokens with EXACT payload structure
  // Use only string & tags.Format<'date-time'> values for dates
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authorized response with token
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at?.toISOString() ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ITodoListAdmin.IAuthorized;
}
