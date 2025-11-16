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
  // Check for duplicate email
  const existingUser = await MyGlobal.prisma.todo_app_user.findFirst({
    where: { email: props.body.email },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Create user record
  const now: Date = new Date();
  const userId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const user = await MyGlobal.prisma.todo_app_user.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Create session record
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const sessionData: any = {
    id: sessionId,
    todo_app_user_id: user.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: accessExpires,
  };

  if (props.body.ip) {
    sessionData.ip = props.body.ip;
  }

  const session = await MyGlobal.prisma.todo_app_user_session.create({
    data: sessionData,
  });

  // Generate JWT tokens
  const accessToken: string = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized user with tokens
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    last_active_at:
      user.last_active_at === null
        ? undefined
        : toISOStringSafe(user.last_active_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
