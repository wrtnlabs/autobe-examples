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

export async function postTodoAppAuthAdminLogin(props: {
  ip: string;
  body: ITodoAppAdminSession.ILogin;
}): Promise<ITodoAppAdminSession.IAuthorized> {
  // Find admin with password_hash
  const admin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Create new session
  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      referrer: props.body.referrer ?? null,
      href: props.body.href ?? null,
      access_token: "",
      refresh_token: "",
      expires_at: toISOStringSafe(accessExpires),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    select: {
      id: true,
      admin_id: true,
      ip: true,
      referrer: true,
      href: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Generate JWT tokens
  const accessPayload = {
    type: "admin" as const,
    id: admin.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: "admin" as const,
    id: admin.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  // Sign JWT tokens
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });
  // Update session with tokens
  await MyGlobal.prisma.todo_app_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return IAuthorized
  return {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(session.expires_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(session.expires_at),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies ITodoAppAdminSession.IAuthorized;
}
