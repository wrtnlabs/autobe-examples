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
  ip: string;
}): Promise<ITodoAppUser.IAuthorized> {
  // Verify user exists
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      display_name: true,
      email: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  if (!user) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid email or password", 401);
  }
  // Create new session
  const now = new Date();
  const accessExpires = toISOStringSafe(
    new Date(now.getTime() + 15 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4(),
      user_id: user.id,
      created_at: toISOStringSafe(now),
      expired_at: accessExpires,
      ip: props.ip,
      href: "",
      referrer: "",
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );
  // Return authorized response
  return {
    display_name: user.display_name,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ITodoAppUser.IAuthorized;
}
