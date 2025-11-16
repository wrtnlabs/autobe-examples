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
  // Check for duplicate email (unique constraint enforced)
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password before storage
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const userId = v4();

  // Create new user row with strictly defined schema fields
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
    },
  });

  // Generate session expiry timestamps as ISO8601 strings
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();

  // Session row
  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      user_id: userId,
      ip: "", // Not provided on registration; default empty string
      href: "", // Not provided on registration; default empty string
      referrer: "", // Not provided on registration; default empty string
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // JWT payloads per domain contract (no as, no Date)
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
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
        type: "user",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: user.id,
    email: user.email,
    token,
  };
}
