import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Retrieve the session (by session id)
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: { id: decoded.session_id },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Fetch the user info; user_id is the foreign key on the session row
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: session.user_id },
  });
  if (!user) {
    throw new HttpException("Account does not exist", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Calculate expirations
  const accessExpiresValue = Date.now() + 60 * 60 * 1000;
  const refreshExpiresValue = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpires = toISOStringSafe(new Date(accessExpiresValue));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresValue));

  // Generate new tokens
  const access = jwt.sign(
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
  const refresh = jwt.sign(
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

  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: user.id,
    email: user.email,
    locked: user.locked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
