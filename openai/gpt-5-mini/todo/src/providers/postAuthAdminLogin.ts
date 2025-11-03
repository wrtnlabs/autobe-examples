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

export async function postAuthAdminLogin(props: {
  body: ITodoAppAdmin.ILogin;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const { body } = props;

  // 1) Locate admin by email
  const admin = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { email: body.email },
  });

  if (!admin) {
    // Audit failed attempt without revealing existence
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "login_failure",
        details: `Failed admin login attempt for email: ${body.email}`,
        ip: body.ip ?? null,
        href: body.href,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  // 2) Enforce account status
  if (!admin.is_active || admin.deleted_at !== null) {
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        event_type: "login_failure",
        details: `Inactive or removed admin attempted login: ${body.email}`,
        ip: body.ip ?? null,
        href: body.href,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  // 3) Verify password
  const isValidPassword = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );
  if (!isValidPassword) {
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        event_type: "login_failure",
        details: `Invalid password attempt for admin: ${body.email}`,
        ip: body.ip ?? null,
        href: body.href,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  // 4) Create session and tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // 5) Audit successful login
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: session.id,
      event_type: "login_success",
      details: "Admin login successful",
      ip: body.ip ?? null,
      href: body.href,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 6) Build and return authorized response
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name ?? null,
    role: admin.role,
    is_active: admin.is_active,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token,
  };
}
