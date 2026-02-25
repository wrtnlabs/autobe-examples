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
  ip: string;
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Check if email already exists
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Only check active (non-deleted) users
    },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password using bcrypt
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const userId = v4();
  const createdAt = new Date();
  const updatedAt = new Date();
  // Create user record
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      created_at: toISOStringSafe(createdAt),
      updated_at: toISOStringSafe(updatedAt),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Generate session expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // Generate session ID
  const sessionId = v4();
  // Create session
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      todo_app_user_id: userId,
      access_token: jwt.sign(
        {
          userId,
          type: "access",
          created_at: toISOStringSafe(createdAt),
          expired_at: toISOStringSafe(accessExpires),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          userId,
          type: "refresh",
          tokenType: "refresh",
          created_at: toISOStringSafe(createdAt),
          expired_at: toISOStringSafe(refreshExpires),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      ip: props.ip || "", // Handle optional IP
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(createdAt),
      expired_at: toISOStringSafe(accessExpires),
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expired_at: true,
    },
  });
  // Validate JWT_SECRET_KEY availability
  if (!MyGlobal.env.JWT_SECRET_KEY) {
    throw new HttpException("JWT secret configuration missing", 500);
  }
  // Generate access JWT
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(createdAt),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // Generate refresh JWT
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(createdAt),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authorized response
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(user.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies ITodoAppUser.IAuthorized;
}
