import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthAdminJoin(props: {
  body: ITodoAppAdminSession.IJoin;
}): Promise<ITodoAppAdminSession.IAuthorized> {
  // Check for duplicate admin
  const existingAdmin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate timestamps
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // Generate JWT tokens
  const accessPayload = {
    type: "admin" as const,
    id: v4(),
    session_id: v4(),
    created_at: now,
  };
  const refreshPayload = {
    type: "admin" as const,
    id: accessPayload.id,
    session_id: accessPayload.session_id,
    tokenType: "refresh" as const,
    created_at: now,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Create admin account
  const admin = await MyGlobal.prisma.todo_app_admins.create({
    data: {
      id: accessPayload.id,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create admin session
  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: accessPayload.session_id,
      admin_id: admin.id,
      ip: props.body.ip ?? "",
      referrer: props.body.referrer ?? "",
      href: props.body.href ?? "",
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: accessExpires,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Build response
  return {
    id: admin.id,
    email: admin.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ITodoAppAdminSession.IAuthorized;
}
