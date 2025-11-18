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
  body: ITodoUser.ICreate;
}): Promise<ITodoUser.IAuthorized> {
  // 1. Email uniqueness check
  const existingUser = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email is already registered", 409);
  }

  // 2. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // 3. Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // 4. Create user record
  const userRecord = await MyGlobal.prisma.todo_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. Create session record (for JWT, registration context)
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: sessionId,
      todo_user_id: userRecord.id,
      ip:
        props.body.ip === null || props.body.ip === undefined
          ? ""
          : (props.body.ip satisfies string as string),
      href: props.body.href ?? "",
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // 6. Generate JWT access & refresh tokens per requirements
  const jwtPayload = {
    type: "user",
    id: userRecord.id,
    session_id: session.id,
    created_at: now,
  };
  const token = {
    access: jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...jwtPayload,
        tokenType: "refresh",
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

  // 7. Return response (never using Date type or assertions)
  return {
    id: userRecord.id,
    email: userRecord.email,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
    token,
  };
}
