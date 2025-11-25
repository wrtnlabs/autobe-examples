import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  const email = props.body.email;
  const password = props.body.password;
  const nowIso = toISOStringSafe(new Date());

  // 1. Find user by email and ensure not deleted
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email, deleted_at: null },
  });

  // 2. Security: never indicate existence, always delay a minimum time per login
  if (!user) {
    await new Promise((r) => setTimeout(r, 700));
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Credential validation only, as lockout and audit logging are disabled by schema
  const validPassword = await PasswordUtil.verify(password, user.password_hash);
  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 4. Create new session row
  const sessionId = v4();
  const accessExpiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpiry,
    },
  });

  // 5. JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiry,
    refreshable_until: refreshExpiry,
  };

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at != null ? toISOStringSafe(user.deleted_at) : undefined,
    token,
  };
}
