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
  const existing = await MyGlobal.prisma.todo_users.findUnique({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const password: string = props.body.password;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (password.length < 8 || !hasLetter || !hasNumber) {
    throw new HttpException(
      "Password must be at least 8 characters, contain at least one letter and one number.",
      400,
    );
  }

  const passwordHash = await PasswordUtil.hash(password);

  const now = toISOStringSafe(new Date());
  const userId = v4();
  const newUser = await MyGlobal.prisma.todo_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: sessionId,
      todo_user_id: newUser.id,
      ip:
        props.body.ip !== null && props.body.ip !== undefined
          ? (props.body.ip satisfies string as string)
          : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  const accessToken = jwt.sign(
    {
      type: "user",
      id: newUser.id,
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
      id: newUser.id,
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

  return {
    id: newUser.id,
    email: newUser.email,
    created_at: toISOStringSafe(newUser.created_at),
    updated_at: toISOStringSafe(newUser.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
