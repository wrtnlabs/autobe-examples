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
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Find user by email with password_hash explicitly selected
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Ensure user account is active
    },
    select: {
      ...TodoAppUserTransformer.select().select,
      password_hash: true,
    },
  });
  if (!user) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Create JWT tokens first
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokenPayload = {
    type: "user",
    id: user.id,
    session_id: v4(), // Generate session ID for tokens
    created_at: new Date().toISOString(),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session with actual tokens
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: tokenPayload.session_id,
      todo_app_user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: "unknown", // Use default value since ip doesn't exist on ILogin
      href: "", // Use default value since href doesn't exist on ILogin
      referrer: "", // Use default value since referrer doesn't exist on ILogin
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return IAuthorized response
  return {
    ...(await TodoAppUserTransformer.transform(user)),
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
