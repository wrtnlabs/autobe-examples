import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: ITodoAppAdministrator.ICreate;
}): Promise<ITodoAppAdministrator.IAuthorized> {
  // Validate email uniqueness - prevent duplicate admin accounts
  const existing = await MyGlobal.prisma.todo_app_administrators.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil (MANDATORY)
  const hashedPassword = await PasswordUtil.hash(props.body.password_hash);

  // Create new administrator record
  const admin = await MyGlobal.prisma.todo_app_administrators.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      role_level: props.body.role_level,
      status: props.body.status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create session record for the new admin
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.todo_app_administrator_sessions.create({
    data: {
      id: v4(),
      administrator_id: admin.id,
      ip: "127.0.0.1", // Default IP for new admin registration
      href: "https://localhost/admin/register", // Default href
      referrer: "https://localhost/admin", // Default referrer
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        email: admin.email,
        role_level: admin.role_level,
        status: admin.status,
        first_name: admin.first_name,
        last_name: admin.last_name,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authenticated admin with tokens
  return {
    id: admin.id,
    token,
  };
}
