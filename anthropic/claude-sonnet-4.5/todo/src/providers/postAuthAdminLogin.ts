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
  const { body } = props;

  // Find admin by email
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: body.email },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account is active
  if (admin.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create session
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_admin_id: admin.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
    },
  });

  // Generate tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: now,
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
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return response
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
