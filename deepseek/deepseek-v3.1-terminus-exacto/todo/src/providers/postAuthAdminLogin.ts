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

export async function postAuthAdminLogin(props: {
  body: ITodoListAdmin.ILogin;
}): Promise<ITodoListAdmin.IAuthorized> {
  // 1. Find admin by email and not deleted
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Account locked check
  if (admin.locked === true) {
    throw new HttpException("Account locked", 401);
  }
  // 3. Password hash verification
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new admin session with required fields as empty strings
  const sessionId = v4();
  const now = new Date();
  const accessExpiration = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpiration),
      ip: "",
      href: "",
      referrer: "",
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
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
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpiration),
    refreshable_until: toISOStringSafe(refreshExpiration),
  };
  // 6. Compose response
  return {
    id: admin.id,
    email: admin.email,
    locked: !!admin.locked,
    role: admin.role,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? undefined : toISOStringSafe(admin.deleted_at),
    token,
  };
}
