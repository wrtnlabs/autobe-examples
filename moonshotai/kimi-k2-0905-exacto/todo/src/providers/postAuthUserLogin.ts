import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoUser.ILogin;
}): Promise<ITodoUser.IAuthorized> {
  // Find user by email
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account security status
  const isLocked =
    user.locked_until && new Date(user.locked_until) > new Date();

  if (isLocked) {
    throw new HttpException("Account is locked. Please try again later", 423);
  }
  if (user.failed_login_attempts >= 5) {
    throw new HttpException(
      "Too many failed login attempts. Account locked",
      423,
    );
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    // Update failed attempts atomically with lockout on 5th attempt
    const now = toISOStringSafe(new Date());
    const newAttemptCount = user.failed_login_attempts + 1;
    const shouldLockout = newAttemptCount >= 5;

    await MyGlobal.prisma.todo_users.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: newAttemptCount,
        locked_until: shouldLockout ? now : user.locked_until,
        updated_at: now,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // Reset failed attempts since login was successful
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const currentTime = toISOStringSafe(new Date());

  // Create new session
  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      ip: props.body.ip ?? "", // FIXED: Removed invalid props.ip reference
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: currentTime,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Reset failed login attempts and clear lockout
  await MyGlobal.prisma.todo_users.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: currentTime,
    },
  });

  // Count active tasks for the user
  const tasksCount = await MyGlobal.prisma.todo_tasks.count({
    where: { todo_user_id: user.id },
  });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: currentTime,
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
        created_at: currentTime,
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

  // Return authorized user data with converted timestamps
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: currentTime,
    mfa_enabled: user.mfa_enabled,
    failed_login_attempts: 0,
    locked_until: null,
    tasks_count: tasksCount,
    token,
  } satisfies ITodoUser.IAuthorized;
}
