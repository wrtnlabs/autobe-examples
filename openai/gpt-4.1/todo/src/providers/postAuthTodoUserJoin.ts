import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserJoin(props: {
  body: ITodoListTodouser.IVerifyJoin;
}): Promise<ITodoListTodouser.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.todo_list_todousers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const userId = v4();

  // Create user
  const user = await MyGlobal.prisma.todo_list_todousers.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_list_todouser_sessions.create({
    data: {
      id: sessionId,
      todo_list_todouser_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate tokens
  const token = {
    access: jwt.sign(
      {
        type: "todoUser",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "todoUser",
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
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  };
}
