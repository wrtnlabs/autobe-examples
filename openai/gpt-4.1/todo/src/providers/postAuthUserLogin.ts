import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  // Step 1: Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (
    !user ||
    user.deleted_at !== null ||
    user.locked === true ||
    user.is_verified === false
  ) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 2: Validate password
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 3: Create session
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessDurationMs = 60 * 60 * 1000; // 1 hour
  const refreshDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + accessDurationMs),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + refreshDurationMs),
  );

  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip:
        props.body.ip !== undefined && props.body.ip !== null
          ? (props.body.ip satisfies string as string)
          : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiresAt,
    },
  });

  // Step 4: Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
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
      type: "user",
      id: user.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    email: user.email,
    is_verified: user.is_verified,
    locked: user.locked,
    locked_at: user.locked_at ? toISOStringSafe(user.locked_at) : undefined,
    email_verification_token: user.email_verification_token ?? undefined,
    email_verification_sent_at: user.email_verification_sent_at
      ? toISOStringSafe(user.email_verification_sent_at)
      : undefined,
    reset_password_token: user.reset_password_token ?? undefined,
    reset_password_sent_at: user.reset_password_sent_at
      ? toISOStringSafe(user.reset_password_sent_at)
      : undefined,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
