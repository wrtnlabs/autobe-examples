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
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });

  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = "";

  const userId = v4();
  const now = new Date();
  const nowISOString = toISOStringSafe(now);

  const createdUser = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
    },
  });

  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const createdSession = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId as string & tags.Format<"uuid">,
      todo_list_user_id: userId as string & tags.Format<"uuid">,
      ip: "",
      href: "",
      referrer: "",
      created_at: nowISOString,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  const accessToken = jwt.sign(
    {
      type: "user",
      id: createdUser.id,
      session_id: createdSession.id,
      created_at: nowISOString,
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
      id: createdUser.id,
      session_id: createdSession.id,
      tokenType: "refresh",
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: createdUser.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
