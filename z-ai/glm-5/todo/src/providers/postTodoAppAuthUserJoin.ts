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

export async function postTodoAppAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Check duplicate email (case-insensitive)
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create user record
  const userId = v4();
  const now = new Date();
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: userId,
      email: props.body.email.toLowerCase(),
      password_hash: hashedPassword,
      display_name: props.body.email,
      failed_attempt_count: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
    },
  });
  // 3. Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      todo_app_user_id: user.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return IAuthorized
  return {
    id: user.id,
    display_name: user.display_name,
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
