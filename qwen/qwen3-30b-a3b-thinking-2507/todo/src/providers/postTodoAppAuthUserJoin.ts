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
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  const emailPrefix = props.body.email.split("@")[0];
  const displayName = emailPrefix.substring(0, 30);
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      display_name: displayName satisfies string &
        tags.MaxLength<30> as string & tags.MaxLength<30>,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      ip: "127.0.0.1",
      expired_at: toISOStringSafe(accessExpires),
      created_at: toISOStringSafe(new Date()),
    },
  });
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
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
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name as string & tags.MaxLength<30>,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
