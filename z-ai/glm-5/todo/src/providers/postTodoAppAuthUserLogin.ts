import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Find user by email with password_hash (case-insensitive)
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      password_hash: true,
      failed_attempt_count: true,
      locked_until: true,
    },
  });
  // Generic error for non-existent user (prevents email enumeration)
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check account lockout
  const now = new Date();
  if (user.locked_until !== null && now < user.locked_until) {
    // Use generic error to prevent information disclosure
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password with timing-safe comparison
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    // Increment failed attempts
    const newFailedCount = user.failed_attempt_count + 1;
    const shouldLock = newFailedCount >= 5;
    const lockUntil = shouldLock
      ? new Date(now.getTime() + 15 * 60 * 1000)
      : null;
    await MyGlobal.prisma.todo_app_users.update({
      where: { id: user.id },
      data: {
        failed_attempt_count: newFailedCount,
        locked_until: lockUntil,
        updated_at: now,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Reset lockout on successful authentication
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: user.id },
    data: {
      failed_attempt_count: 0,
      locked_until: null,
      updated_at: now,
    },
  });
  // 5. Calculate token expiration times
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 6. Create new session
  const sessionId = v4();
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      todo_app_user_id: user.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 7. Generate JWT access token
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 8. Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Construct token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() satisfies string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() satisfies string &
      tags.Format<"date-time">,
  };
  // 10. Return IAuthorized response
  return {
    id: user.id satisfies string & tags.Format<"uuid">,
    display_name: user.display_name,
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
