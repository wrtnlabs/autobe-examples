import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ITodoListAdmin.IJoin;
}): Promise<ITodoListAdmin.IAuthorized> {
  // Check for duplicate admin by email
  const duplicated = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: props.body.email },
  });
  if (duplicated !== null) {
    throw new HttpException("Email already registered.", 409);
  }

  // Hash the password
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const adminId = v4();

  // Create admin record
  const admin = await MyGlobal.prisma.todo_list_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash,
      locked: false,
      role: "admin",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Set session expiration (access/refresh)
  const accessMs = 60 * 60 * 1000;
  const refreshMs = 7 * 24 * 60 * 60 * 1000;
  const accessExpires = toISOStringSafe(new Date(Date.now() + accessMs));
  const refreshExpires = toISOStringSafe(new Date(Date.now() + refreshMs));
  const sessionId = v4();

  // Create admin session
  await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: adminId,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // Issue tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        created_at: now,
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
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: admin.id,
    email: admin.email,
    locked: admin.locked,
    role: admin.role,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? undefined : toISOStringSafe(admin.deleted_at),
    token,
  };
}
