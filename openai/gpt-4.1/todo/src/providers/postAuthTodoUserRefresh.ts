import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserRefresh(props: {
  body: ITodoListTodouser.IVerifyRefresh;
}): Promise<ITodoListTodouser.IAuthorized> {
  // 1. Decode and validate refresh token
  let decoded: { id: string; session_id: string; type: "todoUser" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "todoUser" };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "todoUser") {
    throw new HttpException("Invalid token type", 401);
  }
  // 2. Find the session and ensure not expired
  const session = await MyGlobal.prisma.todo_list_todouser_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_todouser_id: decoded.id,
    },
    include: {
      todoListTodouser: true,
    },
  });
  const now = Date.now();
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  if (session.expired_at && new Date(session.expired_at).getTime() <= now) {
    throw new HttpException("Session has expired", 401);
  }
  const user = session.todoListTodouser;
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // 3. Issue new tokens
  const accessExpireTime = 60 * 60 * 1000; // 1hr
  const refreshExpireTime = 7 * 24 * 60 * 60 * 1000; // 7d
  const issuedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpire = new Date(now + accessExpireTime);
  const refreshExpire = new Date(now + refreshExpireTime);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "todoUser",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "todoUser",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpire),
    refreshable_until: toISOStringSafe(refreshExpire),
  };
  // 4. Update session.expired_at and user.updated_at
  await MyGlobal.prisma.todo_list_todouser_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: toISOStringSafe(refreshExpire) },
  });
  const updatedUser = await MyGlobal.prisma.todo_list_todousers.update({
    where: { id: decoded.id },
    data: { updated_at: issuedAt },
  });
  // 5. Compose response
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    token,
  };
}
