import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  // Check for duplicate email
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Password hash
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Timestamps as ISO 8601 string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());

  // Create user
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.display_name ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate expiries (access: 1h, refresh: 7d) as string
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create session with required 'ip' field; use empty string if no ip is available
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      todo_list_user_id: user.id,
      ip: "", // No ip available, set to empty string for required field
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // JWT token creation
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
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
      type: "user",
      id: user.id,
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

  // Trigger verification email (fake placeholder; real system will call actual logic)
  // await VerificationService.sendVerificationEmail(user.email, user.id);

  return {
    id: user.id,
    email: user.email,
    display_name:
      typeof user.display_name === "string"
        ? user.display_name
        : user.display_name === null
          ? null
          : undefined,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    user: {
      id: user.id,
      email: user.email,
      display_name:
        typeof user.display_name === "string"
          ? user.display_name
          : user.display_name === null
            ? null
            : undefined,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    },
  };
}
