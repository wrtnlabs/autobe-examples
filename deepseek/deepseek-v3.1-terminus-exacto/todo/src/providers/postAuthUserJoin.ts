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

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  const now = toISOStringSafe(new Date());
  // Check duplicate email
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const userId = v4();
  // Create user
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: hashedPassword,
      locked: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Session timing
  const accessExpiry = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  // Create session with required non-null string fields
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      user_id: user.id,
      created_at: now,
      expired_at: toISOStringSafe(accessExpiry),
      ip: "", // Required non-null string
      href: "", // Required non-null string
      referrer: "", // Required non-null string
    },
  });
  // JWT token pair
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
  return {
    id: user.id,
    email: user.email,
    locked: user.locked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiry),
      refreshable_until: toISOStringSafe(refreshExpiry),
    },
  };
}
