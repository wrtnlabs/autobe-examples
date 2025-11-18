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
  // 1. Check for existing user by email (duplicate registration not allowed)
  const duplicate = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (duplicate) {
    throw new HttpException("Email is already registered.", 409);
  }

  // 2. Hash plain password using PasswordUtil
  let password_hash: string;
  try {
    password_hash = await PasswordUtil.hash(props.body.password);
  } catch (err) {
    throw new HttpException("Failed to process password.", 500);
  }

  // 3. Create user
  const now = toISOStringSafe(new Date());
  const user_id = v4();
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash: password_hash,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Create session
  const session_id = v4();
  const session_created_at = now;
  const access_expired_at = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refresh_expired_at = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: session_id,
      todo_list_user_id: user.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: session_created_at,
      expired_at: access_expired_at,
    },
  });

  // 5. Issue JWT tokens. Access: 1hr, Refresh: 7d, payload must match type/contract.
  const access_token = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: session_created_at,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh_token = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: session_created_at,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const token = {
    access: access_token,
    refresh: refresh_token,
    expired_at: access_expired_at,
    refreshable_until: refresh_expired_at,
  };

  // 6. Return the IAuthorized DTO. user property is summary of just created user.
  return {
    id: user.id,
    email: user.email,
    is_locked: user.is_locked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
    user: {
      id: user.id,
      email: user.email,
      is_locked: user.is_locked,
    },
  };
}
