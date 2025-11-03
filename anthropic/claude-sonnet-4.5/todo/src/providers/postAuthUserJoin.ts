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
  body: ITodoListUser.IRegister;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  // Check for duplicate email
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: body.email },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password securely
  const hashedPassword: string = await PasswordUtil.hash(body.password);

  // Create user record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const tokenPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: now,
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Return user profile with tokens
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
