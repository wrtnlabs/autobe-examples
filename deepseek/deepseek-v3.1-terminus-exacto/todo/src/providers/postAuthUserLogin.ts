import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Find user by email
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account status
  if (user.status !== "active" && user.status !== "verified") {
    throw new HttpException("Account is not active", 403);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Update last login timestamp
  const now = new Date();
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: user.id },
    data: {
      last_login_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      ip: props.body.ip !== undefined ? props.body.ip : "",
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: "TodoApp", // Default user agent
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
      last_activity_at: toISOStringSafe(now), // Set to current time
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
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
        type: "user",
        id: user.id,
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
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    last_login_at: updatedUser.last_login_at
      ? toISOStringSafe(new Date(updatedUser.last_login_at))
      : undefined,
    created_at: toISOStringSafe(new Date(user.created_at)),
    updated_at: toISOStringSafe(new Date(updatedUser.updated_at)),
    token,
  };
}
