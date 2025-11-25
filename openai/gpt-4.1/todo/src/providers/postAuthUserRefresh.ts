import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  const { refresh_token } = props.body;
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: "user" };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate user session (not expired)
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (!session) {
    throw new HttpException("Session expired or not found", 401);
  }

  // Get the user record
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: session.todo_list_user_id },
  });

  if (!user) {
    throw new HttpException("User account not found", 403);
  }

  // Generate new tokens (reuse session_id, update timestamps)
  const nowISO = toISOStringSafe(new Date());
  const accessExpISO = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpISO = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update the session expiration
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpISO) },
  });

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access,
      refresh,
      expired_at: accessExpISO,
      refreshable_until: refreshExpISO,
    },
  };
}
