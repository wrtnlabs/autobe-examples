import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogin(props: {
  user: UserPayload;
  email: string & tags.Format<"email">;
  password: string & tags.MinLength<8> & tags.MaxLength<128>;
  body: ITodoUser.ILogin;
}): Promise<ITodoUser.IAuthorized> {
  // Validate user credentials against todo_users schema
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Ensure account is not deleted
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create new session record in todo_user_sessions
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT access and refresh tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized user response
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: typia.assert<string & tags.Format<"date-time">>(
      user.deleted_at ? toISOStringSafe(user.deleted_at) : "",
    ),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoUser.IAuthorized;
}
