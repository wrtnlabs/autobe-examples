import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ITodoAppAdmin.ICreate;
}): Promise<ITodoAppAdmin.IAuthorized> {
  // Validate: Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.todo_app_admin.findFirst({
    where: { email: props.body.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password securely using bcrypt
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Create admin actor record in database
  const now = new Date();
  const nowIso = toISOStringSafe(now);

  const admin = await MyGlobal.prisma.todo_app_admin.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_active_at: null,
    },
  });

  // Create session record for this authentication instance
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_app_admin_session.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens for immediate authentication
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
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

  // Return authorized admin with tokens
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    last_active_at:
      admin.last_active_at === null
        ? null
        : toISOStringSafe(admin.last_active_at),
    token,
  };
}
