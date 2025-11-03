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

export async function postAuthUserJoin(props: {
  body: ITodoUser.IJoin;
}): Promise<ITodoUser.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create user with proper ID generation (schema has no @default)
  const user = await MyGlobal.prisma.todo_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      mfa_enabled: false,
      failed_login_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create session for authentication
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      ip: "", // Will be populated from request context - implementation dependent
      href: "", // Will be populated from request context
      referrer: "", // Will be populated from request context
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens with proper payload structure
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id, // Actor ID, not session ID
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
        type: "user",
        id: user.id,
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
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Count tasks for new user (will be 0)
  const tasksCount = await MyGlobal.prisma.todo_tasks.count({
    where: { todo_user_id: user.id },
  });

  // Return formatted response with proper type handling
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    mfa_enabled: user.mfa_enabled,
    failed_login_attempts: user.failed_login_attempts as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    locked_until: user.locked_until ? toISOStringSafe(user.locked_until) : null,
    tasks_count: tasksCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    token,
  };
}
