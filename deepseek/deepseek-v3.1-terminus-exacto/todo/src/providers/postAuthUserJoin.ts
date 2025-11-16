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
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      email: props.body.email,
    },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password using PasswordUtil (ignore password_hash from body)
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const userId = v4() as string & tags.Format<"uuid">;
  const currentTime = toISOStringSafe(new Date());

  // Calculate expiration times without Date objects
  const currentTimeMillis = Date.now();
  const accessExpiresMillis = currentTimeMillis + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMillis = currentTimeMillis + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpires = toISOStringSafe(new Date(accessExpiresMillis));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresMillis));

  // Create the user (actor) record
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: hashedPassword, // Use the hashed password, not from body
      status: "pending",
      created_at: currentTime,
      updated_at: currentTime,
      deleted_at: null,
    },
  });

  const sessionId = v4() as string & tags.Format<"uuid">;

  // Create session record with default values (since session context not provided)
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      todo_app_user_id: userId,
      ip: "127.0.0.1", // Default IP since not provided in current props structure
      href: "/", // Default URL
      referrer: "", // Default referrer
      created_at: currentTime,
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        created_at: currentTime,
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
        id: userId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: currentTime,
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

  // Return authorized user information
  return {
    id: userId,
    email: user.email,
    password_hash: user.password_hash,
    status: typia.assert<"pending" | "active" | "suspended">(user.status),
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    token,
  };
}
