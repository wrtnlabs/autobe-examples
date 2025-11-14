import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.ICreate;
}): Promise<ITodoAppAdmin.IAuthorized> {
  // Validate email uniqueness
  const existingAdmin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: { email: props.body.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Create admin record
  const admin = await MyGlobal.prisma.todo_app_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: props.body.password_hash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: "0.0.0.0",
      href: "",
      referrer: "",
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
    refreshable_until: toISOStringSafe(accessExpires),
  };

  return {
    id: admin.id,
    email: admin.email,
    token,
    role: props.body.role,
  };
}
