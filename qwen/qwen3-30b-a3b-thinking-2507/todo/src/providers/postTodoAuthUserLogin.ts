import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postTodoAuthUserLogin(props: {
  body: ITodoUser.ILogin;
}): Promise<ITodoUser.IAuthorized> {
  // 1. Find user by email (with password_hash and email_verified)
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      password_hash: true,
      email: true,
      email_verified: true,
      display_name: true,
      created_at: true,
      deleted_at: true,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify email is verified
  if (!user.email_verified) {
    throw new HttpException("Email not verified", 403);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Generate token expiration times
  const accessExpires: Date = new Date(Date.now() + 60 * 15 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 5. Create new session record
  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4(),
      user: { connect: { id: user.id } },
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 6. Generate JWT tokens with correct payload
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "15m",
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
  // 7. Construct and return authorized response
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name ?? "Unnamed",
    createdAt: toISOStringSafe(user.created_at),
    token,
  };
}
