import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoAppUser.ICreate;
}): Promise<ITodoAppUser.IAuthorized> {
  // Check for existing user with same email
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const userId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create user and session in transaction for data consistency
  const [user, session] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_users.create({
      data: {
        id: userId,
        email: props.body.email,
        password_hash: hashedPassword,
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_user_sessions.create({
      data: {
        id: v4(),
        todo_app_user_id: userId,
        ip: "unknown", // Default value since not provided in props
        href: "unknown", // Default value since not provided in props
        referrer: "unknown", // Default value since not provided in props
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    }),
  ]);

  // Generate JWT tokens with correct payload structure
  const basePayload = {
    type: "user" as const,
    id: userId,
    session_id: session.id,
    created_at: now,
  };

  const token = {
    access: jwt.sign(basePayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...basePayload, tokenType: "refresh" as const },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: userId,
    email: props.body.email,
    status: "active",
    created_at: now,
    updated_at: now,
    deleted_at: undefined, // Optional field - use undefined
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
