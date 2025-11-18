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
  body: ITodoListUser.IJoin;
}): Promise<ITodoListUser.IAuthorized> {
  // 1. Email uniqueness check (always lowercased)
  const emailLower = props.body.email.toLowerCase();
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: emailLower },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Securely hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  // 3. Create new user (pending verification)
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4(),
      email: emailLower,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      is_verified: false,
      is_active: false,
      created_at: now,
      updated_at: now,
    },
  });
  // 4. Create a session for auditing/verification related flows
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      todo_list_user_id: user.id,
      ip: props.body.ip ? (props.body.ip as string) : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: now,
    },
  });
  // 5. JWT token generation (even for pending verification, contract requires token in output)
  const tokenPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: now,
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
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    is_verified: user.is_verified,
    is_active: user.is_active,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: now,
      refreshable_until: now,
    },
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      is_verified: user.is_verified,
      is_active: user.is_active,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
  };
}
