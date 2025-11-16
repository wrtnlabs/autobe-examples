import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoAppUser.ICredentials;
}): Promise<ITodoAppUser.IAuthorized> {
  // Step 1: Find user by email
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 2: Check account status before password verification for security
  if (user.status === "suspended") {
    throw new HttpException("Account is suspended", 403);
  }
  if (user.status === "pending") {
    throw new HttpException("Account pending verification", 403);
  }

  // Step 3: Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 4: Create session record using string timestamps
  const currentTime = new Date().toISOString();
  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      ip: props.body.ip ?? "", // Schema shows ip is required string, so use empty string as fallback
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: currentTime,
      expired_at: new Date(accessExpiresMs).toISOString(),
    },
  });

  // Step 5: Generate JWT tokens with proper payload structure
  const tokenPayload = {
    type: "user" as const,
    id: user.id,
    session_id: session.id,
    created_at: currentTime,
  };

  const refreshPayload = {
    ...tokenPayload,
    tokenType: "refresh" as const,
  };

  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    }),
    expired_at: new Date(accessExpiresMs).toISOString(),
    refreshable_until: new Date(refreshExpiresMs).toISOString(),
  };

  // Step 6: Return authorized user information with proper type conversions
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    status: typia.assert<"pending" | "active" | "suspended">(user.status),
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token,
  };
}
