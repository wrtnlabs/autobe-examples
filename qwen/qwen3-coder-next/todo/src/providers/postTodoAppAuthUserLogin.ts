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
  ip: string;
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Find user with password_hash
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
    },
  });
  if (!user) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create new session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      ip: props.ip,
      href: "/api/v1/auth/login",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    ...accessPayload,
    tokenType: "refresh" as const,
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });
  // 5. Update last login timestamp
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: user.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 6. Return authorized response
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoAppUser.IAuthorized;
}
