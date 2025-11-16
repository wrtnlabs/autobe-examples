import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserJoin(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.ICreate;
}): Promise<ITodoListTodoListUser.IAuthorized> {
  // Check if user email already exists
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Current timestamp in ISO 8601 format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Generate user ID with branded uuid type
  const userId: string & tags.Format<"uuid"> = v4();

  // Create new user
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate session expiry timestamps
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 3600000),
  ); // 1 hour
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600000),
  ); // 7 days

  // Generate session ID with branded uuid type
  const sessionId: string & tags.Format<"uuid"> = v4();

  // Create session
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: userId,
      created_at: now,
      expired_at: accessExpires,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  // Generate JWT tokens
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const accessToken: string = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken: string = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
